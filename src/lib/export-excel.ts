import ExcelJS from 'exceljs';
import { adminDb } from './firebase-admin';

export async function generateResultsExcelBuffer(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Hackathon Jury Portal System';
  workbook.lastModifiedBy = 'Admin';
  workbook.created = new Date();

  // Fetch data from Firestore
  if (!adminDb) {
    throw new Error('Database not initialized');
  }

  const teamsSnap = await adminDb.collection('teams').get();
  const teams = teamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
  teams.sort((a, b) => (a.teamNumber || '').localeCompare(b.teamNumber || ''));

  const usersSnap = await adminDb.collection('users').get();
  const juries = usersSnap.docs.filter(doc => doc.data().role === 'JURY').map(doc => ({ id: doc.id, ...doc.data() } as any));
  juries.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const venuesSnap = await adminDb.collection('venues').get();
  const venues = venuesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
  venues.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const psSnap = await adminDb.collection('problemStatements').get();
  const problemStatements = psSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

  const evalSnap = await adminDb.collection('evaluations').get();
  const evaluations = evalSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

  const assignmentsSnap = await adminDb.collection('juryTeamAssignments').get();
  const assignments = assignmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

  // Build relations in memory
  teams.forEach(team => {
    team.venue = venues.find(v => v.id === team.venueId) || { id: team.venueId, name: 'Unknown', capacity: 0 };
    team.problemStatement = problemStatements.find(ps => ps.id === team.problemStatementId) || null;
    team.evaluations = evaluations.filter(e => e.teamId === team.id).map(e => {
      e.jury = juries.find(j => j.id === e.juryId) || { id: e.juryId, name: 'Unknown' };
      return e;
    });
    team.assignments = assignments.filter(a => a.teamId === team.id).map(a => {
      a.jury = juries.find(j => j.id === a.juryId) || { id: a.juryId, name: 'Unknown' };
      return a;
    });
  });

  venues.forEach(venue => {
    venue.teams = teams.filter(t => t.venueId === venue.id);
  });

  // Calculate ranks for completed teams
  const completedTeamsWithScore = teams
    .filter((t) => t.status === 'COMPLETED' && t.finalScore !== null && t.finalScore !== undefined)
    .sort((a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0));

  const rankMap = new Map<string, number>();
  completedTeamsWithScore.forEach((team, index) => {
    rankMap.set(team.id, index + 1);
  });

  // -------------------------------------------------------------
  // Sheet 1: Final Results
  // -------------------------------------------------------------
  const sheet1 = workbook.addWorksheet('Final Results', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  // Headers
  const juryHeaders: string[] = [];
  juries.forEach((j, i) => {
    juryHeaders.push(`Jury ${i + 1} (${j.name})`);
  });

  const baseHeaders = ['Rank', 'Team Number', 'Team Name', 'Venue', 'Problem Statement'];
  const endHeaders = ['Final Average', 'Evaluation Status'];
  sheet1.addRow([...baseHeaders, ...juryHeaders, ...endHeaders]);

  // Style Header Row
  const headerRow1 = sheet1.getRow(1);
  headerRow1.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow1.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }, // Slate 800
  };
  headerRow1.alignment = { vertical: 'middle', horizontal: 'center' };

  // Add Data Rows
  teams.forEach((team) => {
    const rank = rankMap.get(team.id) ? `#${rankMap.get(team.id)}` : 'N/A';
    const juryScoresMap = new Map<string, number>();

    team.evaluations.forEach((ev: any) => {
      if (ev.status === 'SUBMITTED') {
        juryScoresMap.set(ev.juryId, ev.totalScore);
      }
    });

    const juryScoreCells = juries.map((j) => {
      const score = juryScoresMap.get(j.id);
      return score !== undefined ? score.toFixed(2) : '-';
    });

    const finalAvg =
      team.finalScore !== null && team.finalScore !== undefined
        ? team.finalScore.toFixed(2)
        : '-';

    sheet1.addRow([
      rank,
      team.teamNumber,
      team.teamName,
      team.venue.name,
      team.problemStatement?.code ?? 'N/A',
      ...juryScoreCells,
      finalAvg,
      team.status || 'PENDING',
    ]);
  });

  // Auto-fit column widths
  sheet1.columns.forEach((column) => {
    let maxLen = 12;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const val = cell.value ? String(cell.value) : '';
      if (val.length > maxLen) maxLen = val.length;
    });
    column.width = Math.min(maxLen + 4, 35);
  });

  // -------------------------------------------------------------
  // Sheet 2: Detailed Evaluations
  // -------------------------------------------------------------
  const sheet2 = workbook.addWorksheet('Detailed Evaluations', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet2.addRow([
    'Team Number',
    'Team Name',
    'Venue',
    'Jury Name',
    'Criterion Name',
    'Max Marks',
    'Awarded Score',
    'Jury Comment',
    'Submission Time',
    'Status',
  ]);

  const headerRow2 = sheet2.getRow(1);
  headerRow2.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow2.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' },
  };

  teams.forEach((team) => {
    team.evaluations.forEach((ev: any) => {
      if (ev.scores && Array.isArray(ev.scores)) {
        ev.scores.forEach((sc: any) => {
          sheet2.addRow([
            team.teamNumber,
            team.teamName,
            team.venue.name,
            ev.jury.name,
            sc.criterionName,
            sc.criterionMaxMarks,
            sc.score,
            ev.juryComment || '-',
            new Date(ev.submittedAt || ev.createdAt).toLocaleString(),
            ev.status,
          ]);
        });
      }
    });
  });

  sheet2.columns.forEach((col) => {
    col.width = 18;
  });

  // -------------------------------------------------------------
  // Sheet 3: Evaluation Summary
  // -------------------------------------------------------------
  const sheet3 = workbook.addWorksheet('Evaluation Summary');
  const totalTeams = teams.length;
  const completedTeamsCount = teams.filter((t) => t.status === 'COMPLETED').length;
  const pendingTeams = totalTeams - completedTeamsCount;

  sheet3.addRow(['Hackathon Evaluation Metrics']);
  sheet3.getRow(1).font = { size: 16, bold: true };
  sheet3.addRow([]);
  sheet3.addRow(['Total Teams', totalTeams]);
  sheet3.addRow(['Completed Teams', completedTeamsCount]);
  sheet3.addRow(['Pending Teams', pendingTeams]);
  sheet3.addRow(['Completion Percentage', `${((completedTeamsCount / (totalTeams || 1)) * 100).toFixed(1)}%`]);
  sheet3.addRow([]);

  sheet3.addRow(['Venue Breakdown']);
  sheet3.getRow(7).font = { size: 14, bold: true };
  sheet3.addRow(['Venue Name', 'Capacity', 'Assigned Teams', 'Completed', 'Pending', 'Progress']);

  const venueHeaderRow = sheet3.getRow(8);
  venueHeaderRow.font = { bold: true };
  venueHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

  venues.forEach((v) => {
    const vTeams = teams.filter((t) => t.venueId === v.id);
    const vCompleted = vTeams.filter((t) => t.status === 'COMPLETED').length;
    const vPending = vTeams.length - vCompleted;
    const vPct = `${((vCompleted / (vTeams.length || 1)) * 100).toFixed(1)}%`;
    sheet3.addRow([v.name, v.capacity || 0, vTeams.length, vCompleted, vPending, vPct]);
  });

  sheet3.columns.forEach((col) => {
    col.width = 20;
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
