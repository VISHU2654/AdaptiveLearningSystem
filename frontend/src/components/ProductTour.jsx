import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

function ProductTour() {
  const location = useLocation();

  useEffect(() => {
    // The tour is best demonstrated on the dashboard
    if (location.pathname !== '/dashboard') return;

    const driverObj = driver({
      showProgress: true,
      animate: true,
      steps: [
        { 
          element: '#dashboard-welcome', 
          popover: { 
            title: 'Welcome to Adaptive Learning', 
            description: 'This is your dynamic workspace. Based on your profile and goals, we generate personalized course recommendations.',
            side: "bottom", 
            align: 'start'
          }
        },
        { 
          element: '#learning-sidebar', 
          popover: { 
            title: 'Navigation & Progress', 
            description: 'Use the sidebar to explore new courses, view your earned certificates, or switch between Free and Premium plans.',
            side: "right", 
            align: 'start' 
          }
        },
        { 
          element: '#recommendations', 
          popover: { 
            title: 'AI-Powered Recommendations', 
            description: 'Our Hybrid Deep Learning engine analyzes your behavior and skill level to suggest courses perfectly tailored to you.',
            side: "top", 
            align: 'start' 
          }
        },
        { 
          element: '#chatbot-button', 
          popover: { 
            title: '24/7 AI Learning Coach', 
            description: 'Need help understanding a topic? Ask our built-in AI assistant. It provides clear explanations, study roadmaps, and resources.',
            side: "left", 
            align: 'end' 
          }
        },
      ]
    });

    const hasSeenTour = localStorage.getItem('hasSeenTour');
    let timer;
    if (!hasSeenTour) {
      // Small delay to ensure all components are fully mounted
      timer = setTimeout(() => {
        driverObj.drive();
        localStorage.setItem('hasSeenTour', 'true');
      }, 1500);
    }

    // Expose a global function to start the tour manually
    window.startProductTour = () => {
      driverObj.drive();
    };

    return () => {
      if (timer) clearTimeout(timer);
      window.startProductTour = null;
    };
  }, [location.pathname]);

  return null;
}

export default ProductTour;
