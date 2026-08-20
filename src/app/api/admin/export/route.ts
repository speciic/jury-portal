import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { generateResultsExcelBuffer } from '@/lib/export-excel';
import { createAuditLog } from '@/lib/audit';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const buffer = await generateResultsExcelBuffer();

    await createAuditLog({
      userId: session.userId,
      userRole: session.role,
      action: 'EXPORT_EXCEL_RESULTS',
      entity: 'Event',
      reason: 'Admin downloaded evaluation result sheet',
    });

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `Hackathon_Evaluation_Results_${timestamp}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating Excel download:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
