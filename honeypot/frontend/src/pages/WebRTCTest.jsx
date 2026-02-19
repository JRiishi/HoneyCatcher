/**
 * WebRTC Connection Test Page - Diagnostics
 * Use this to verify your WebRTC setup is working
 */

import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000';

const WebRTCTest = () => {
  const [logs, setLogs] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [roomJoined, setRoomJoined] = useState(false);
  const [audioPermission, setAudioPermission] = useState('unknown');
  const [testRole, setTestRole] = useState('operator');
  const [testRoomId, setTestRoomId] = useState('test-room-123');
  
  const socketRef = useRef(null);
  
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
    console.log(`[${timestamp}] ${message}`);
  };
  
  // Test 1: Socket.IO Connection
  const testSocketConnection = () => {
    addLog('🔌 Testing Socket.IO connection...', 'info');
    
    try {
      socketRef.current = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true
      });
      
      socketRef.current.on('connect', () => {
        addLog('✅ Socket.IO connected successfully!', 'success');
        addLog(`Socket ID: ${socketRef.current.id}`, 'info');
        setSocketConnected(true);
      });
      
      socketRef.current.on('connected', (data) => {
        addLog(`✅ Received 'connected' event: ${JSON.stringify(data)}`, 'success');
      });
      
      socketRef.current.on('connect_error', (error) => {
        addLog(`❌ Socket.IO connection error: ${error.message}`, 'error');
        setSocketConnected(false);
      });
      
      socketRef.current.on('disconnect', (reason) => {
        addLog(`⚠️ Socket.IO disconnected: ${reason}`, 'warning');
        setSocketConnected(false);
      });
      
      socketRef.current.on('joined_room', (data) => {
        addLog(`✅ Joined room: ${JSON.stringify(data)}`, 'success');
        setRoomJoined(true);
      });
      
      socketRef.current.on('peer_joined', (data) => {
        addLog(`👥 Peer joined: ${JSON.stringify(data)}`, 'success');
      });
      
      socketRef.current.on('error', (data) => {
        addLog(`❌ Server error: ${JSON.stringify(data)}`, 'error');
      });
      
    } catch (error) {
      addLog(`❌ Failed to create socket: ${error.message}`, 'error');
    }
  };
  
  // Test 2: Microphone Permission
  const testMicrophonePermission = async () => {
    addLog('🎤 Testing microphone permission...', 'info');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      addLog('✅ Microphone permission granted!', 'success');
      addLog(`Audio tracks: ${stream.getAudioTracks().length}`, 'info');
      setAudioPermission('granted');
      
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      addLog(`❌ Microphone permission denied: ${error.message}`, 'error');
      setAudioPermission('denied');
    }
  };
  
  // Test 3: Join Room
  const testJoinRoom = () => {
    if (!socketRef.current || !socketConnected) {
      addLog('⚠️ Socket not connected. Run socket connection test first.', 'warning');
      return;
    }
    
    addLog(`📞 Joining room ${testRoomId} as ${testRole}...`, 'info');
    
    socketRef.current.emit('join_room', {
      room_id: testRoomId,
      role: testRole
    });
  };
  
  // Test 4: Backend Health Check
  const testBackendHealth = async () => {
    addLog('🏥 Checking backend health...', 'info');
    
    try {
      const response = await fetch(`${SOCKET_URL}/health`);
      const data = await response.json();
      
      if (response.ok) {
        addLog(`✅ Backend is healthy: ${JSON.stringify(data)}`, 'success');
      } else {
        addLog(`⚠️ Backend responded with status ${response.status}`, 'warning');
      }
    } catch (error) {
      addLog(`❌ Backend health check failed: ${error.message}`, 'error');
      addLog('ℹ️  Make sure backend server is running on port 8000', 'info');
    }
  };
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6 mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">🔧 WebRTC Connection Test</h1>
          <p className="text-gray-400">Run these tests to diagnose WebRTC issues</p>
        </div>
        
        {/* Status Indicators */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className={`p-4 rounded-lg ${socketConnected ? 'bg-green-500/20 border border-green-500' : 'bg-gray-800/50 border border-gray-700'}`}>
            <div className="text-sm text-gray-400">Socket.IO</div>
            <div className="text-lg font-bold text-white">{socketConnected ? '✅ Connected' : '⏹️ Disconnected'}</div>
          </div>
          
          <div className={`p-4 rounded-lg ${audioPermission === 'granted' ? 'bg-green-500/20 border border-green-500' : audioPermission === 'denied' ? 'bg-red-500/20 border border-red-500' : 'bg-gray-800/50 border border-gray-700'}`}>
            <div className="text-sm text-gray-400">Microphone</div>
            <div className="text-lg font-bold text-white">
              {audioPermission === 'granted' ? '✅ Allowed' : audioPermission === 'denied' ? '❌ Denied' : '❓ Unknown'}
            </div>
          </div>
          
          <div className={`p-4 rounded-lg ${roomJoined ? 'bg-green-500/20 border border-green-500' : 'bg-gray-800/50 border border-gray-700'}`}>
            <div className="text-sm text-gray-400">Room Status</div>
            <div className="text-lg font-bold text-white">{roomJoined ? '✅ Joined' : '⏹️ Not Joined'}</div>
          </div>
        </div>
        
        {/* Test Controls */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">🧪 Run Tests</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Test Room ID</label>
              <input
                type="text"
                value={testRoomId}
                onChange={(e) => setTestRoomId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">Test Role</label>
              <select
                value={testRole}
                onChange={(e) => setTestRole(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white"
              >
                <option value="operator">Operator</option>
                <option value="scammer">Scammer</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={testBackendHealth}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              1️⃣ Test Backend Health
            </button>
            
            <button
              onClick={testSocketConnection}
              className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              disabled={socketConnected}
            >
              2️⃣ Test Socket.IO Connection
            </button>
            
            <button
              onClick={testMicrophonePermission}
              className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              3️⃣ Test Microphone
            </button>
            
            <button
              onClick={testJoinRoom}
              className="px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors"
              disabled={!socketConnected}
            >
              4️⃣ Test Join Room
            </button>
          </div>
          
          <button
            onClick={() => {
              setLogs([]);
              if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
              }
              setSocketConnected(false);
              setRoomJoined(false);
              setAudioPermission('unknown');
              addLog('🔄 Tests reset', 'info');
            }}
            className="w-full mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Reset All Tests
          </button>
        </div>
        
        {/* Logs */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4">📋 Test Logs</h2>
          
          <div className="bg-gray-900 rounded p-4 h-96 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No logs yet. Run a test to see output.
              </div>
            ) : (
              logs.map((log, i) => (
                <div
                  key={i}
                  className={`py-1 ${
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'success' ? 'text-green-400' :
                    log.type === 'warning' ? 'text-yellow-400' :
                    'text-gray-300'
                  }`}
                >
                  <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                </div>
              ))
            )}
          </div>
          
          <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded">
            <p className="text-sm text-blue-200">
              <strong>💡 Common Issues:</strong>
            </p>
            <ul className="text-xs text-blue-300 mt-2 space-y-1 list-disc list-inside">
              <li>Backend not running → Start with: <code className="bg-gray-900 px-1 py-0.5 rounded">cd backend && uvicorn main:app --reload</code></li>
              <li>Socket.IO connection fails → Check VITE_SOCKET_URL in frontend/.env</li>
              <li>Microphone denied → Click the lock icon in browser address bar and allow microphone</li>
              <li>Room join fails → Check backend logs for errors</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebRTCTest;
