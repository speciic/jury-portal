import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css'; // Make sure to copy your CSS here

const API_KEY = import.meta.env.VITE_GOOGLE_PAGESPEED_API_KEY;

export default function App() {
  const [teams, setTeams] = useState([]);
  const [formData, setFormData] = useState({ teamName: '', url: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load from local storage on start
  useEffect(() => {
    const saved = localStorage.getItem('lighthouseTeams');
    if (saved) setTeams(JSON.parse(saved));
  }, []);

  // Save to local storage when teams change
  useEffect(() => {
    localStorage.setItem('lighthouseTeams', JSON.stringify(teams));
  }, [teams]);

  // The actual scoring logic (Moved from your Next.js Backend)
  const fetchLighthouseScore = async (teamName, url) => {
    let normalizedUrl = url;
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    const params = new URLSearchParams();
    params.append('url', normalizedUrl);
    params.append('key', API_KEY);
    params.append('strategy', 'mobile');
    params.append('category', 'performance');
    params.append('category', 'accessibility');
    params.append('category', 'best-practices');
    params.append('category', 'seo');

    const response = await axios.get(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`
    );

    const cats = response.data?.lighthouseResult?.categories;
    if (!cats) throw new Error('No Lighthouse data returned');

    const performance = Math.round((cats.performance?.score || 0) * 100);
    const accessibility = Math.round((cats.accessibility?.score || 0) * 100);
    const best_practices = Math.round((cats['best-practices']?.score || 0) * 100);
    const seo = Math.round((cats.seo?.score || 0) * 100);
    const average = Math.round(((performance + accessibility + best_practices + seo) / 4) * 100) / 100;

    return {
      id: Date.now() + Math.random(),
      name: teamName,
      url: normalizedUrl,
      performance,
      accessibility,
      best_practices,
      seo,
      average,
      timestamp: new Date().toISOString(),
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.teamName || !formData.url) {
      setError("Please fill in both fields");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetchLighthouseScore(formData.teamName, formData.url);
      setTeams(prev => {
        const filtered = prev.filter(t => t.name !== formData.teamName);
        return [...filtered, result].sort((a, b) => b.average - a.average);
      });
      setFormData({ teamName: '', url: '' });
    } catch (err) {
      setError(err.message || "Failed to fetch scores");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    if(window.confirm("Are you sure you want to clear all teams?")) {
      setTeams([]);
    }
  };

  const handleDelete = (id) => {
    setTeams(teams.filter(t => t.id !== id));
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>Lighthouse Scorer (React Version)</h1>
      
      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ flex: 1, padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
          <h3>Add a Team</h3>
          {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input 
              placeholder="Team Name" 
              value={formData.teamName} 
              onChange={e => setFormData({...formData, teamName: e.target.value})}
              style={{ padding: '8px' }}
            />
            <input 
              placeholder="Website URL" 
              value={formData.url} 
              onChange={e => setFormData({...formData, url: e.target.value})}
              style={{ padding: '8px' }}
            />
            <button disabled={loading} style={{ padding: '10px', background: 'blue', color: 'white', border: 'none', borderRadius: '4px' }}>
              {loading ? 'Testing...' : 'Test Website'}
            </button>
          </form>

          <button onClick={handleClear} style={{ marginTop: '20px', padding: '10px', background: 'red', color: 'white', border: 'none', borderRadius: '4px' }}>
            Clear All
          </button>
        </div>

        <div style={{ flex: 2 }}>
          <h3>Leaderboard</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#eee', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Team</th>
                <th style={{ padding: '8px' }}>Perf</th>
                <th style={{ padding: '8px' }}>Access</th>
                <th style={{ padding: '8px' }}>Best Prac</th>
                <th style={{ padding: '8px' }}>SEO</th>
                <th style={{ padding: '8px' }}>Avg</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {teams.map(team => (
                <tr key={team.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px' }}>{team.name}</td>
                  <td style={{ padding: '8px' }}>{team.performance}</td>
                  <td style={{ padding: '8px' }}>{team.accessibility}</td>
                  <td style={{ padding: '8px' }}>{team.best_practices}</td>
                  <td style={{ padding: '8px' }}>{team.seo}</td>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>{team.average}</td>
                  <td><button onClick={() => handleDelete(team.id)}>X</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {teams.length === 0 && <p>No teams scored yet.</p>}
        </div>
      </div>
    </div>
  );
}
