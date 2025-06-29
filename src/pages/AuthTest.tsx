import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/contexts/AuthContext";

const AuthTest = () => {
  const { user, loading, signIn, signOut } = useAuth();
  const [email, setEmail] = useState('raymond.chai@8atoms.com');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<string>('');
  const [testing, setTesting] = useState(false);

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

  return (
    <div style={{
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: '#f5f5f5',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 'bold',
          marginBottom: '30px',
          textAlign: 'center',
          color: '#333'
        }}>
          Auth Test Page
        </h1>

        {/* Auth Status */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '30px',
          border: '2px solid #ddd',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '15px', color: '#333' }}>
            Authentication Status
          </h2>
          <div style={{ color: '#666' }}>
            <p><strong>Loading:</strong> {loading ? "Yes" : "No"}</p>
            <p><strong>User:</strong> {user ? user.email : "Not logged in"}</p>
          </div>
        </div>

        {/* Login Form - ALWAYS VISIBLE */}
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '8px',
          marginBottom: '30px',
          border: '3px solid #007bff',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#333' }}>
            🔐 LOGIN TEST FORM
          </h2>

          {/* Email Input - FORCED VISIBLE */}
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="email-field" style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '8px',
              color: '#333'
            }}>
              📧 Email Address:
            </label>
            <input
              id="email-field"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email here..."
              style={{
                width: '100%',
                padding: '15px',
                fontSize: '18px',
                border: '3px solid #007bff',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                color: '#000000',
                minHeight: '60px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Password Input - FORCED VISIBLE */}
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="password-field" style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '8px',
              color: '#333'
            }}>
              🔒 Password:
            </label>
            <input
              id="password-field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password here..."
              style={{
                width: '100%',
                padding: '15px',
                fontSize: '18px',
                border: '3px solid #007bff',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                color: '#000000',
                minHeight: '60px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Buttons - FORCED VISIBLE */}
          <div style={{ marginTop: '30px' }}>
            <button
              onClick={testDirectAuth}
              disabled={testing}
              style={{
                width: '100%',
                padding: '20px',
                fontSize: '20px',
                fontWeight: 'bold',
                backgroundColor: testing ? '#ccc' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: testing ? 'not-allowed' : 'pointer',
                marginBottom: '15px',
                minHeight: '70px'
              }}
            >
              {testing ? '⏳ TESTING...' : '🚀 TEST LOGIN'}
            </button>

            <button
              onClick={handleTestLogout}
              disabled={testing}
              style={{
                width: '100%',
                padding: '20px',
                fontSize: '20px',
                fontWeight: 'bold',
                backgroundColor: testing ? '#ccc' : '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: testing ? 'not-allowed' : 'pointer',
                marginBottom: '15px',
                minHeight: '70px'
              }}
            >
              {testing ? '⏳ TESTING...' : '🚪 TEST LOGOUT'}
            </button>

            <button
              onClick={clearResults}
              style={{
                width: '100%',
                padding: '20px',
                fontSize: '20px',
                fontWeight: 'bold',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                minHeight: '70px'
              }}
            >
              🗑️ CLEAR RESULTS
            </button>
          </div>
        </div>

        {/* Test Results - FORCED VISIBLE */}
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '8px',
          border: '3px solid #17a2b8',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#333' }}>
            📊 TEST RESULTS
          </h2>
          <textarea
            value={result}
            readOnly
            placeholder="Test results will appear here..."
            style={{
              width: '100%',
              height: '400px',
              padding: '20px',
              fontSize: '16px',
              fontFamily: 'monospace',
              border: '2px solid #17a2b8',
              borderRadius: '6px',
              backgroundColor: '#f8f9fa',
              color: '#333',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default AuthTest;
