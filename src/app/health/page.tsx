export default function HealthPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Health Check</h1>
      <p>If you can see this, the Next.js server is working!</p>
      <p>Current time: {new Date().toISOString()}</p>
      <div>
        <h2>Quick Links:</h2>
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/settings">Settings</a></li>
          <li><a href="/reports">Reports</a></li>
          <li><a href="/test-fixes">Test Fixes</a></li>
        </ul>
      </div>
    </div>
  )
}