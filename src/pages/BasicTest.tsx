const BasicTest = () => {
  return (
    <div style={{ 
      padding: '100px', 
      backgroundColor: '#ff0000',
      color: '#ffffff',
      fontSize: '48px',
      textAlign: 'center',
      minHeight: '100vh'
    }}>
      <h1>🔥 BASIC TEST PAGE 🔥</h1>
      <p>If you can see this, React is working!</p>
      <input 
        type="text" 
        placeholder="TEST INPUT"
        style={{
          width: '500px',
          height: '100px',
          fontSize: '32px',
          padding: '20px',
          margin: '50px',
          border: '10px solid yellow',
          backgroundColor: 'white',
          color: 'black'
        }}
      />
      <button
        style={{
          width: '400px',
          height: '100px',
          fontSize: '32px',
          backgroundColor: 'green',
          color: 'white',
          border: '5px solid darkgreen',
          cursor: 'pointer'
        }}
        onClick={() => alert('Button clicked!')}
      >
        CLICK ME
      </button>
    </div>
  );
};

export default BasicTest;
