import React, { useState } from 'react';


const EmailSubscription = () => {
  const [title, setTitle] = useState('');

  //Chat created button click function to send welcome email to user through pipedream
  const handleSubmit = async () => {
    if (!title) {
      alert("Please enter an email address");
      return;
    }
  
    try {
      const response = await fetch("https://eo3nb8qkt3n52xu.m.pipedream.net", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: title }),
      });
  
      if (response.ok) {
        alert("Subscription successful! Check your inbox for a welcome email.");
        setTitle(""); // Clear input field after submission
      } else {
        alert("Failed to subscribe. Please try again.");
      }
    } catch (error) {
      console.error("Error subscribing:", error);
      alert("An error occurred. Please try again later.");
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-10 px-6 rounded-lg shadow-lg">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-2">🔔 Stay Updated</h2>
        <p className="text-lg opacity-90 mb-6">
          Subscribe to receive real-time air quality alerts and updates.
        </p>

        <div className="flex items-center justify-center gap-4">
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full max-w-md px-5 py-3 text-black rounded-lg border-2 border-white focus:ring-2 focus:ring-white focus:outline-none"

            //stores the value of the input tfield into the const 'title'
            value = {title}
            onChange = {(e) => setTitle(e.target.value)}


          />
          <button onClick={handleSubmit}
           className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg shadow-md hover:bg-gray-200 transition">
            Subscribe
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailSubscription;