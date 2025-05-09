import React from 'react';
import Header from '@/components/Header';

const Contact = () => {
  return (
    <>
      <Header />

      {/* Hero Section */}
    <section className="pt-32 pb-10 px-6 md:px-24 text-center bg-gradient-to-b from-blue-50 to-white">
  {/* <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
    Contact us to...
  </h1> */}
</section>

<section className="px-6 md:px-24 pb-16 bg-white">
  <div className="grid md:grid-cols-3 gap-8 text-center">
    <div className="flex flex-col items-center space-y-3">
      <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
</svg>
      </div>
      <h2 className="text-lg font-semibold text-blue-700">Report a Problem</h2>
      <p className="text-sm text-gray-600">Tell us if something isn’t working quite right.</p>
    </div>

    <div className="flex flex-col items-center space-y-3">
      <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M12 3v3m6.364 1.636l-2.121 2.121M21 12h-3M17.364 17.364l-2.121-2.121M12 21v-3M6.636 17.364l2.121-2.121M3 12h3M6.636 6.636l2.121 2.121" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-blue-700">Become a Sensor Host</h2>
      <p className="text-sm text-gray-600">Help monitor air quality by hosting a sensor in your community.</p>
    </div>

    <div className="flex flex-col items-center space-y-3">
      <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-blue-700">Give Us Feedback</h2>
      <p className="text-sm text-gray-600">Share your thoughts and suggestions to help us improve.</p>
    </div>
  </div>
</section>


      {/* Form Section */}
      <section className="bg-gradient-to-b from-white to-blue-50 px-6 md:px-20 py-20">
  <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-start">
    
    {/* Left side: Title & paragraph */}
    <div className="text-left">
      <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent mb-4">
        Contact Us!
      </h2>
      <p className="text-muted-foreground text-base max-w-md">
        Fill out the form and we’ll get back to you as soon as possible. Whether you're reporting a bug or sharing an idea, we value your input!
      </p>
    </div>

    {/* Right side: Contact Form */}
    <form
      action="https://formspree.io/f/your_form_id"
      method="POST"
      className="bg-white p-8 rounded-xl shadow-lg shadow-gray-300 border border-blue-200 space-y-6 w-full"
    >
      <div className="grid md:grid-cols-2 gap-4">
        <input
          type="text"
          name="First Name"
          required
          placeholder="First Name"
          className="p-3 border border-gray-300 rounded-md w-full"
        />
        <input
          type="text"
          name="Last Name"
          placeholder="Last Name"
          className="p-3 border border-gray-300 rounded-md w-full"
        />
      </div>
      <input
        type="email"
        name="Email"
        required
        placeholder="Email Address"
        className="p-3 border border-gray-300 rounded-md w-full"
      />
      <textarea
        name="Message"
        required
        placeholder="Your message..."
        className="p-3 border border-gray-300 rounded-md w-full h-40"
      />
      <button
        type="submit"
        className="w-full bg-blue-600 text-white font-semibold py-3 rounded-md hover:bg-blue-700 transition"
      >
        Submit
      </button>
    </form>
  </div>
</section>

    </>
  );
};

export default Contact;
