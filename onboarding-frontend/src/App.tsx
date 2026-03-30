import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SendTransaction from './components/SendTransaction';
import Layout from './components/Layout';
import PaymentNotificationWidget from './components/PaymentNotificationWidget';
import './App.css';

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

function App() {
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!userEmail) return;

    const setupPush = async () => {
      try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          console.warn('Push messaging is not supported by this browser');
          return;
        }

        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('ServiceWorker registered with scope:', registration.scope);

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('Notification permission not granted');
          return;
        }

        const VAPID_PUBLIC_KEY = 'BKNNSpStHajjKeUssPhoHPiJpSpVxu9CjgGhu8Sz_8SzoFE0N7RQPo76-zwQUL-VrCA0Qv3IPpD7LaGijfcl4jg';
        const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey
          });
        }

        await fetch('/api/onboarding/user/push-subscription', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription)
        });
        console.log('Push subscription successfully stored to backend!');
      } catch (err) {
        console.error('Push setup failed:', err);
      }
    };

    setupPush();
  }, [userEmail]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/onboarding/user/profile", {
          method: "GET",
          credentials: "include",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user && data.user.email) {
            setUserEmail(data.user.email);
            console.log("User email set for notifications:", data.user.email);
          }
        }
      } catch (err) {
        console.error("Failed to fetch user for notifications:", err);
      }
    };
    fetchUser();
  }, []);

  return (
    <div className="app-container">
      <Router>
        <PaymentNotificationWidget
          userEmail={userEmail}
          gatewayUrl="/"
        />
        <Routes>
          <Route path="/" element={
            <div className="glass-card login-card fade-in">
              <Login />
            </div>
          } />
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/send" element={<SendTransaction />} />
          </Route>
        </Routes>
      </Router>
    </div>
  );
}

export default App;
