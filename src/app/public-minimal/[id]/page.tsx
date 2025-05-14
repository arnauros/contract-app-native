export default function MinimalContractPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <html>
      <head>
        <title>Contract Viewer</title>
        <style>{`
          body { font-family: system-ui, sans-serif; line-height: 1.5; padding: 2rem; max-width: 800px; margin: 0 auto; }
          pre { background: #f5f5f5; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
          .error { color: #e53e3e; }
          .loading { color: #4299e1; }
          button { background: #4299e1; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.25rem; cursor: pointer; }
          button:hover { background: #3182ce; }
        `}</style>
      </head>
      <body>
        <h1>Contract Viewer</h1>
        <p>Contract ID: {params.id}</p>

        <div id="app">Loading...</div>

        <script
          dangerouslySetInnerHTML={{
            __html: `
          // Minimal client-side script to load the contract
          (async function() {
            const appDiv = document.getElementById('app');
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');
            const id = '${params.id}';
            
            if (!token) {
              appDiv.innerHTML = '<div class="error">No token provided. Please use a valid contract link.</div>';
              return;
            }
            
            try {
              appDiv.innerHTML = '<div class="loading">Loading contract...</div>';
              
              // Make API request to get contract
              const response = await fetch('/api/public-contract?id=' + id + '&token=' + token);
              const data = await response.json();
              
              if (!response.ok) {
                throw new Error(data.error || 'Failed to load contract');
              }
              
              if (!data.contract) {
                throw new Error('Contract not found');
              }
              
              // Render contract
              appDiv.innerHTML = \`
                <h2>\${data.contract.title || 'Contract'}</h2>
                <pre>\${JSON.stringify(data.contract.content, null, 2)}</pre>
              \`;
              
            } catch (error) {
              appDiv.innerHTML = \`<div class="error">Error: \${error.message}</div>\`;
            }
          })();
        `,
          }}
        ></script>
      </body>
    </html>
  );
}
