import React from "react";
import Header from '@/components/Header';


interface Developer {
  name: string;
  role: string;
  img: string;
}

const developers: Developer[] = [
  {
    name: "Aniket Chaudhari",
    role: "Frontend & UI Developer",
    img: "src/images/Image.png",
  },
  {
    name: "Gowrish Rajagopal",
    role: "Backend & Sensor Integration",
    img: "/images/gowrish.jpg",
  },
  {
    name: "Yasharth Pandey",
    role: "Project Lead & Full Stack Developer",
    img: "src/images/Screenshot 2025-05-15 173829 (1).png",
  },
];

const AboutPage: React.FC = () => {
  return (
    <>
    <Header/>

    <div className="bg-white text-gray-900">
      {/* Section 1: Mission */}
      <section className="min-h-screen flex flex-col md:flex-row items-center justify-center px-6 py-16 bg-gradient-to-r from-blue-50 to-blue-100">
        <div className="md:w-1/2">
          <div className = "w-full">
            <img
            src="src/images/lickinggg.jpg"
            alt="Community Sensor"
            className="rounded-2xl w-full max-w-[600px] max-h-[400px] object-contain"
          />
          </div>
          
        </div>
        <div className="md:w-1/2 md:pl-12 mt-8 md:mt-0">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent mb-4">
            Our Mission
          </h2>
          <p className="text-lg leading-relaxed text-gray-700">
            <strong>Clean air belongs to everyone.</strong>
            <br />
            This website is part of a community-driven initiative to monitor and
            improve air quality in Licking County using affordable, open-source technology.
            Born out of a desire to make environmental data accessible to all,
            this project empowers neighborhoods to host sensors, view live
            data, and take action based on real-time air conditions. The
            platform is fully open-source, built with transparency and
            collaboration in mind — and we invite others to join, build, and
            improve it.
          </p>
        </div>
      </section>

      {/* Section 2: Devices */}
      <section className="min-h-screen flex flex-col-reverse md:flex-row items-center justify-center px-6 py-16 bg-white gap-x-20">
        <div className="md:w-1/2 md:pr-12 mt-8 md:mt-0">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-400 bg-clip-text text-transparent mb-4">
            The Devices
          </h2>
          <p className="text-lg leading-relaxed text-gray-700">
            <strong>Built for communities. Trusted by science.</strong>
            <br />
            The air quality data on this site is powered by SimpleAQ sensors —
            low-cost, open-source devices. These devices
            use laser-based particle sensors to monitor PM2.5 concentrations and
            relay that data over Wi-Fi in real time. With a focus on simplicity,
            affordability, and reliability, SimpleAQ devices make it possible
            for anyone to contribute to environmental monitoring. Learn more at{" "}
            <a
              href="https://simpleaq.org/blog/what_is_simpleaq"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              simpleaq.org
            </a>
            .
          </p>
        </div>
        <div className="md:w-1/2">
            <div className = "w-full">
            <img
                src="src/images/sensor for now.jpg"
                alt="SimpleAQ Device"
                className=" rounded-2xl w-full max-w-[600px] max-h-[400px] object-contain"
            />
            </div>
          
        </div>
      </section>

      {/* Section 3: Developer Team */}
      <section className="min-h-screen px-6 py-16 bg-gradient-to-b from-blue-50 to-white text-center">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-12">
          Meet the Developers
        </h2>
        <div className="flex flex-col md:flex-row justify-center items-center gap-10">
          {developers.map((dev, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-lg p-6 max-w-xs hover:scale-105 transform transition duration-300"
            >
              <img
                src={dev.img}
                alt={dev.name}
                className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
              />
              <h3 className="text-xl font-semibold">{dev.name}</h3>
              <p className="text-sm text-gray-600">{dev.role}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
    </>
  );
};

export default AboutPage;
