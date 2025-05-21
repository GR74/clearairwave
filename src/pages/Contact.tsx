import React from 'react';
import Header from '@/components/Header';

const Contact = () => {
  return (
    <>
      <Header />

      {/* Icon Info Section */}
      <section className="pt-24 pb-10 px-6 md:px-24 text-center bg-blue-100">
        <div className="grid md:grid-cols-3 gap-10 text-center">
          {[
            {
              title: 'Report a Problem',
              desc: 'Tell us if something isn’t working quite right.',
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ),
            },
            {
              title: 'Become a Sensor Host',
              desc: 'Help monitor air quality by hosting a sensor in your community.',
              icon: (
                <path d="M12 3v3m6.364 1.636l-2.121 2.121M21 12h-3M17.364 17.364l-2.121-2.121M12 21v-3M6.636 17.364l2.121-2.121M3 12h3M6.636 6.636l2.121 2.121" />
              ),
            },
            {
              title: 'Give Us Feedback',
              desc: 'Share your thoughts and suggestions to help us improve.',
              icon: (
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              ),
            },
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col items-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-white text-blue-600 shadow-md flex items-center justify-center transition hover:scale-105">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  {item.icon}
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-blue-700">{item.title}</h2>
              <p className="text-sm text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="bg-gradient-to-b from-white to-blue-50 px-6 md:px-20 py-16">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-start">
          {/* Left side: Title & paragraph */}
          <div className="text-left">
            <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent mb-4">
              Contact Us!
            </h2>
            <p className="text-muted-foreground text-base max-w-md">
              Fill out the form and we’ll get back to you as soon as possible.
              Whether you're reporting a bug or sharing an idea, we value your input!
            </p>
          </div>

          {/* Right side: Contact Form */}
          <form
            action="https://formspree.io/f/your_form_id"
            method="POST"
            className="bg-white p-8 rounded-xl shadow-lg border border-blue-200 space-y-6 w-full"
          >
            <div className="grid md:grid-cols-2 gap-4">
              <input
                type="text"
                name="First Name"
                required
                placeholder="First Name"
                className="p-3 border border-gray-300 rounded-md w-full focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                type="text"
                name="Last Name"
                placeholder="Last Name"
                className="p-3 border border-gray-300 rounded-md w-full focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <input
              type="email"
              name="Email"
              required
              placeholder="Email Address"
              className="p-3 border border-gray-300 rounded-md w-full focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <textarea
              name="Message"
              required
              placeholder="Your message..."
              className="p-3 border border-gray-300 rounded-md w-full h-40 focus:ring-2 focus:ring-blue-500 outline-none"
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
