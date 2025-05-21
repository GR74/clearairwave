
import React from 'react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import AQSummary from '@/components/AQSummary';
import AQMap from '@/components/AQMap';
import AirQualityTips from '@/components/AirQualityTips';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart2, Users, Globe, Bell } from 'lucide-react';
import EmailSubscription from '@/components/dashboard/EmailSubscription';


const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <div id = "email"></div>
        <HeroSection />
        <EmailSubscription />

        {/* Features section */}
        <section id = "guide" className="py-16 bg-gradient-to-b from-white to-secondary/30">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-semibold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                Breathe Better with ClearSkies
              </h2>
              <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
                Our platform provides comprehensive air quality monitoring and analytics 
                to help communities breathe cleaner air.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  icon: <BarChart2 className="h-10 w-10 text-primary" />,
                  title: "Real-time Monitoring",
                  description: "Access live air quality data from sensors across your community."
                },
                {
                  icon: <Users className="h-10 w-10 text-primary" />,
                  title: "Community Insights",
                  description: "See how air quality affects different neighborhoods and areas."
                },
                {
                  icon: <Bell className="h-10 w-10 text-primary" />,
                  title: "Personalized Alerts",
                  description: "Get notified when air quality changes in your area of interest."
                },
                {
                  icon: <Globe className="h-10 w-10 text-primary" />,
                  title: "Environmental Impact",
                  description: "Understand how air quality relates to broader environmental trends."
                }
              ].map((feature, index) => (
                <div 
                  key={index} 
                  className="glass-card p-6 rounded-xl hover:scale-[1.01] transition-all duration-300"
                >
                  <div className="mb-4">{feature.icon}</div>
                  <h3 className="text-lg font-medium mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        <AQSummary />
        
        <section className="py-16 bg-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-semibold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                Community Air Quality Map
              </h2>
              <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
                Explore air quality readings from sensors across the community with our interactive map.
              </p>
              <div className="mt-6">
                <Link to="/map">
                  <Button size="lg" className="rounded-full group">
                    View Full Map
                    <ArrowRight className="ml-1 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="relative w-full h-[500px] rounded-xl shadow-lg overflow-hidden border border-white/20">
              <AQMap />
            </div>
          </div>
        </section>
        <div id = "aqt"></div>
        <AirQualityTips/>
      </main>
      <footer className="bg-gradient-to-t from-secondary to-secondary/50 py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">ClearSkies</h3>
              <p className="text-muted-foreground text-sm">
                Empowering communities with real-time air quality data to make informed decisions.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-4">QUICK LINKS</h3>
              <ul className="space-y-2">
                <li><Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">Home</Link></li>
                <li><Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">Dashboard</Link></li>
                <li><Link to="/map" className="text-sm text-muted-foreground hover:text-primary transition-colors">Map</Link></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">About</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-4">RESOURCES</h3>
              <ul className="space-y-2">
                <li><a href="#guide" className="text-sm text-muted-foreground hover:text-primary transition-colors">  Guide</a></li>
                <li><a href="#aqt" className="text-sm text-muted-foreground hover:text-primary transition-colors">Air Quality Tips</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-4">CONNECT</h3>
              <ul className="space-y-2">
                <li><a href="#email" className="text-sm text-muted-foreground hover:text-primary transition-colors">Real-time Alerts</a></li>
                <li><Link to="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">Contact Us</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center">
            <p className="text-muted-foreground">
              ClearSkies Community Air Quality Monitoring Platform
            </p>
            {/* <p className="text-xs text-muted-foreground mt-2">
              Demo application with simulated data and real data • {new Date().getFullYear()}
            </p> */}
            <p className="text-xs text-muted-foreground mt-2">
              Made by    
              <a href="https://www.linkedin.com/in/aniket-chaudhari-12238833a/" className="text-blue-400 "> Aniket Chaudhari</a>, 
              <a href="https://www.linkedin.com/in/gowrishrajagopal/" className="text-blue-400 "> Gowrish Rajagopal</a>, 
              <a href="https://www.linkedin.com/in/yasharth-pandey/" className="text-blue-400 "> Yasharth Pandey</a>
            </p>
          </div>
          <div className="border-t border-border pt-8 text-center">
          
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
