import React, { useState } from 'react';

const SimpleAuthTest = () => {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('');

  return (
    <div style={{ 
      padding: '50px', 
      backgroundColor: '#ffffff',
      minHeight: '100vh'
    }}>
      <h1 style={{ 
        fontSize: '48px', 
        color: 'red', 
        textAlign: 'center',
        marginBottom: '50px'
      }}>
        🔥 SIMPLE AUTH TEST 🔥
      </h1>
      
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        backgroundColor: '#ffff00',
        padding: '50px',
        border: '10px solid red'
      }}>
        <h2 style={{ fontSize: '32px', color: 'blue', marginBottom: '30px' }}>
          📧 EMAIL INPUT:
        </h2>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: '100%',
            height: '80px',
            fontSize: '24px',
            padding: '20px',
            border: '5px solid blue',
            backgroundColor: 'white',
            color: 'black',
            marginBottom: '30px'
          }}
          placeholder="TYPE EMAIL HERE"
        />
        
        <h2 style={{ fontSize: '32px', color: 'blue', marginBottom: '30px' }}>
          🔒 PASSWORD INPUT:
        </h2>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: '100%',
            height: '80px',
            fontSize: '24px',
            padding: '20px',
            border: '5px solid blue',
            backgroundColor: 'white',
            color: 'black',
            marginBottom: '30px'
          }}
          placeholder="TYPE PASSWORD HERE"
        />
        
        <button
          style={{
            width: '100%',
            height: '100px',
            fontSize: '32px',
            backgroundColor: 'green',
            color: 'white',
            border: '5px solid darkgreen',
            cursor: 'pointer'
          }}
          onClick={() => alert(`Email: ${email}, Password: ${password}`)}
        >
          🚀 CLICK ME TO TEST 🚀
        </button>
        
        <div style={{
          marginTop: '30px',
          padding: '20px',
          backgroundColor: 'lightblue',
          border: '3px solid blue'
        }}>
          <p style={{ fontSize: '20px', color: 'black' }}>
            Current Email: {email}
          </p>
          <p style={{ fontSize: '20px', color: 'black' }}>
            Password Length: {password.length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SimpleAuthTest;
