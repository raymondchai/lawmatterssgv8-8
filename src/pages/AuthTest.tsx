import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/contexts/AuthContext";

const AuthTest = () => {
  // 🚨 EMERGENCY: Simplified state to avoid crashes
  const [email, setEmail] = useState('raymond.chai@8atoms.com');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<string>('');
  const [testing, setTesting] = useState(false);

  // 🚨 EMERGENCY: Try-catch around useAuth to prevent crashes
  let user = null;
  let loading = false;
  let signIn = null;
  let signOut = null;

  try {
    const auth = useAuth();
    user = auth.user;
    loading = auth.loading;
    signIn = auth.signIn;
    signOut = auth.signOut;
  } catch (error) {
    console.error('🚨 AUTH CONTEXT ERROR:', error);
  }

  useEffect(() => {
    // Initial environment check
    const checkEnvironment = () => {
      let envCheck = 'Environment Check:\n';
      envCheck += `✓ Supabase URL: ${import.meta.env.VITE_SUPABASE_URL}\n`;
      envCheck += `✓ Supabase Key: ${import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Present' : 'Missing'}\n`;
      envCheck += `✓ Current URL: ${window.location.href}\n`;
      envCheck += `✓ User Agent: ${navigator.userAgent}\n`;
      setResult(envCheck);
    };

    checkEnvironment();
  }, []);

  const testDirectAuth = async () => {
    setTesting(true);
    setResult('Testing direct Supabase authentication...\n');

    try {
      // Test 1: Check Supabase connection
      setResult(prev => prev + '✓ Supabase client initialized\n');

      // Test 2: Check current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setResult(prev => prev + `❌ Session error: ${sessionError.message}\n`);
      } else {
        setResult(prev => prev + `✓ Current session: ${session ? 'Logged in as ' + session.user.email : 'Not logged in'}\n`);
      }

      // Test 3: Try to sign in if password provided
      if (password) {
        setResult(prev => prev + 'Attempting direct sign in...\n');
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setResult(prev => prev + `❌ Sign in error: ${error.message}\n`);
          setResult(prev => prev + `Error details: ${JSON.stringify(error, null, 2)}\n`);
        } else {
          setResult(prev => prev + `✓ Sign in successful: ${data.user?.email}\n`);
          setResult(prev => prev + `Session: ${data.session ? 'Created' : 'None'}\n`);
        }
      }

      // Test 4: Test database connection
      setResult(prev => prev + 'Testing database connection...\n');
      const { data: lawFirms, error: dbError } = await supabase
        .from('law_firms')
        .select('id, name')
        .limit(1);

      if (dbError) {
        setResult(prev => prev + `❌ Database error: ${dbError.message}\n`);
      } else {
        setResult(prev => prev + `✓ Database connection: ${lawFirms?.length || 0} law firms found\n`);
      }

    } catch (error: any) {
      setResult(prev => prev + `❌ Unexpected error: ${error.message}\n`);
      setResult(prev => prev + `Stack trace: ${error.stack}\n`);
    } finally {
      setTesting(false);
    }
  };

  const testContextAuth = async () => {
    if (!password) {
      setResult(prev => prev + '❌ Please enter a password first\n');
      return;
    }

    setTesting(true);
    setResult(prev => prev + 'Testing AuthContext sign in...\n');

    try {
      await signIn(email, password);
      setResult(prev => prev + '✓ AuthContext sign in successful\n');
    } catch (error: any) {
      setResult(prev => prev + `❌ AuthContext sign in error: ${error.message}\n`);
    } finally {
      setTesting(false);
    }
  };

  const handleTestLogout = async () => {
    setTesting(true);
    try {
      await signOut();
      setResult(prev => prev + '✓ Sign out successful\n');
    } catch (error: any) {
      setResult(prev => prev + `❌ Sign out error: ${error.message}\n`);
    } finally {
      setTesting(false);
    }
  };

  const clearResults = () => {
    setResult('');
  };

  // 🚨 EMERGENCY: Super simple return to avoid crashes
  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '48px', color: '#000', textAlign: 'center', marginBottom: '30px' }}>
        🚨 EMERGENCY AUTH TEST 🚨
      </h1>

      {/* 🚨 EMERGENCY STATUS */}
      <div style={{
        backgroundColor: '#ffff00',
        padding: '20px',
        marginBottom: '30px',
        border: '5px solid #000',
        fontSize: '24px',
        fontWeight: 'bold'
      }}>
        <p>Loading: {loading ? "YES" : "NO"}</p>
        <p>User: {user ? user.email : "NOT LOGGED IN"}</p>
      </div>

      {/* 🚨 EMERGENCY INPUTS - ABSOLUTE MAXIMUM VISIBILITY */}
      <div style={{
        backgroundColor: '#ff0000',
        padding: '50px',
        margin: '30px 0',
        border: '10px solid #000000'
      }}>
        <h2 style={{
          fontSize: '60px',
          color: '#ffffff',
          textAlign: 'center',
          marginBottom: '40px',
          fontWeight: 'bold'
        }}>
          🚨 INPUTS HERE 🚨
        </h2>

        {/* EMAIL */}
        <div style={{ marginBottom: '40px' }}>
          <label style={{
            display: 'block',
            fontSize: '40px',
            color: '#ffffff',
            fontWeight: 'bold',
            marginBottom: '20px'
          }}>
            📧 EMAIL:
          </label>
          <input
            type="email"
            value={email || ''}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="TYPE EMAIL HERE"
            style={{
              display: 'block',
              width: '100%',
              height: '120px',
              padding: '30px',
              fontSize: '36px',
              border: '10px solid #ffff00',
              backgroundColor: '#ffffff',
              color: '#000000',
              fontWeight: 'bold',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* PASSWORD */}
        <div style={{ marginBottom: '40px' }}>
          <label style={{
            display: 'block',
            fontSize: '40px',
            color: '#ffffff',
            fontWeight: 'bold',
            marginBottom: '20px'
          }}>
            🔒 PASSWORD:
          </label>
          <input
            type="password"
            value={password || ''}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="TYPE PASSWORD HERE"
            style={{
              display: 'block',
              width: '100%',
              height: '120px',
              padding: '30px',
              fontSize: '36px',
              border: '10px solid #ffff00',
              backgroundColor: '#ffffff',
              color: '#000000',
              fontWeight: 'bold',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* EMERGENCY BUTTONS */}
        <div>
          <button
            onClick={testDirectAuth}
            disabled={testing}
            style={{
              display: 'block',
              width: '100%',
              height: '150px',
              padding: '40px',
              fontSize: '48px',
              fontWeight: 'bold',
              backgroundColor: testing ? '#666666' : '#00ff00',
              color: '#000000',
              border: '10px solid #000000',
              cursor: testing ? 'not-allowed' : 'pointer',
              marginBottom: '30px'
            }}
          >
            {testing ? '⏳ TESTING...' : '🚀 LOGIN TEST'}
          </button>

          <button
            onClick={handleTestLogout}
            disabled={testing}
            style={{
              display: 'block',
              width: '100%',
              height: '150px',
              padding: '40px',
              fontSize: '48px',
              fontWeight: 'bold',
              backgroundColor: testing ? '#666666' : '#ff6600',
              color: '#000000',
              border: '10px solid #000000',
              cursor: testing ? 'not-allowed' : 'pointer',
              marginBottom: '30px'
            }}
          >
            {testing ? '⏳ TESTING...' : '🚪 LOGOUT TEST'}
          </button>

          <button
            onClick={clearResults}
            style={{
              display: 'block',
              width: '100%',
              height: '150px',
              padding: '40px',
              fontSize: '48px',
              fontWeight: 'bold',
              backgroundColor: '#cccccc',
              color: '#000000',
              border: '10px solid #000000',
              cursor: 'pointer',
              marginBottom: '30px'
            }}
          >
            🗑️ CLEAR
          </button>
        </div>
      </div>

      {/* RESULTS */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '30px',
        margin: '30px 0',
        border: '5px solid #000000'
      }}>
        <h2 style={{ fontSize: '36px', marginBottom: '20px', color: '#000' }}>
          📊 RESULTS
        </h2>
        <textarea
          value={result || ''}
          readOnly
          placeholder="Results will appear here..."
          style={{
            width: '100%',
            height: '300px',
            padding: '20px',
            fontSize: '18px',
            border: '3px solid #000000',
            backgroundColor: '#f0f0f0',
            color: '#000000',
            boxSizing: 'border-box'
          }}
        />
      </div>
    </div>
  );
};

export default AuthTest;
