import React from 'react';
import { 
  LineChart, 
  Leaf, 
  CloudSun, 
  Database, 
  Shield, 
  Building2, 
  Users,
  ArrowRight,
  MapPin
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface ProcessStepProps {
  number: string;
  title: string;
  description: string;
}

interface BenefitCardProps {
  icon: React.ReactNode;
  title: string;
  benefits: string[];
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-accent-yellow p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-primary mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function ProcessStep({ number, title, description }: ProcessStepProps) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 bg-primary text-accent-light rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
        {number}
      </div>
      <h3 className="text-xl font-semibold text-primary mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function BenefitCard({ icon, title, benefits }: BenefitCardProps) {
  return (
    <div className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-primary mb-4">{title}</h3>
      <ul className="space-y-2">
        {benefits.map((benefit, index) => (
          <li key={index} className="flex items-center text-gray-600">
            <ArrowRight className="h-4 w-4 text-secondary mr-2" />
            {benefit}
          </li>
        ))}
      </ul>
    </div>
  );
}

function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-accent-yellow">
      {/* Hero Section */}
      <header className="bg-primary">
        <nav className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img 
                src="/agroscore-logo.png" 
                alt="AgroScore Logo" 
                className="h-12"
                style={{ width: "150px", height: "auto", objectFit: "contain" }} 
              />
            </div>
            <div className="hidden md:flex space-x-8">
              <a href="#features" className="text-accent-light hover:text-white">Features</a>
              <a href="#how-it-works" className="text-accent-light hover:text-white">How It Works</a>
              <a href="#benefits" className="text-accent-light hover:text-white">Benefits</a>
              <button 
                onClick={() => navigate('/login')}
                className="bg-secondary text-white px-6 py-2 rounded-full font-semibold hover:bg-opacity-90"
              >
                Get Started
              </button>
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-6 py-20">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2">
              <h1 className="text-4xl md:text-6xl font-bold text-accent-light leading-tight">
                Smart Credit Scoring for Modern Agriculture
              </h1>
              <p className="mt-4 text-xl text-accent-yellow">
                Revolutionizing farmer credit evaluation with advanced data analytics and real-time environmental insights.
              </p>
              <button 
                onClick={() => navigate('/login')}
                className="mt-8 bg-secondary text-white px-8 py-3 rounded-full font-semibold text-lg hover:bg-opacity-90 flex items-center"
              >
                Start Assessment
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </div>
            <div className="md:w-1/2 mt-10 md:mt-0">
              <div className="relative w-full h-[400px] overflow-hidden rounded-lg shadow-xl">
                <img 
                  src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80"
                  alt="Farming landscape"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-primary mb-16">
            Comprehensive Evaluation Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <FeatureCard 
              icon={<MapPin className="h-8 w-8 text-primary" />}
              title="GIS Integration"
              description="Real-time geographic data analysis for precise land evaluation and risk assessment"
            />
            <FeatureCard 
              icon={<CloudSun className="h-8 w-8 text-primary" />}
              title="Weather Intelligence"
              description="Advanced weather forecasting integration for crop yield prediction"
            />
            <FeatureCard 
              icon={<Database className="h-8 w-8 text-primary" />}
              title="Soil Analytics"
              description="Detailed soil health metrics and fertility analysis"
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-accent-yellow">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-primary mb-16">
            How AgroScore Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <ProcessStep 
              number="1"
              title="Data Collection"
              description="Input farm location and basic details"
            />
            <ProcessStep 
              number="2"
              title="Analysis"
              description="AI-powered evaluation of environmental factors"
            />
            <ProcessStep 
              number="3"
              title="Scoring"
              description="Generate comprehensive credit score"
            />
            <ProcessStep 
              number="4"
              title="Report"
              description="Detailed insights and recommendations"
            />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 bg-accent-light">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-primary mb-16">
            Key Benefits
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <BenefitCard 
              icon={<Building2 className="h-8 w-8 text-primary" />}
              title="For Financial Institutions"
              benefits={[
                "Reduced risk assessment time",
                "More accurate credit decisions",
                "Comprehensive risk profiles"
              ]}
            />
            <BenefitCard 
              icon={<Users className="h-8 w-8 text-primary" />}
              title="For Farmers"
              benefits={[
                "Fair credit evaluation",
                "Quick approval process",
                "Tailored loan options"
              ]}
            />
            <BenefitCard 
              icon={<Shield className="h-8 w-8 text-primary" />}
              title="Compliance & Security"
              benefits={[
                "Data privacy compliance",
                "Secure information handling",
                "Regulatory adherence"
              ]}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-accent-light mb-8">
            Ready to Transform Agricultural Credit Scoring?
          </h2>
          <button 
            onClick={() => navigate('/login')}
            className="bg-secondary text-white px-8 py-3 rounded-full font-semibold text-lg hover:bg-opacity-90"
          >
            Get Started Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-accent-light py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center">
                <img 
                  src="/agroscore-logo.png" 
                  alt="AgroScore Logo" 
                  className="h-8"
                />
              </div>
              <p className="mt-4 text-accent-yellow">
                Revolutionizing agricultural credit scoring with advanced technology.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-accent-yellow">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-white">How it Works</a></li>
                <li><a href="#benefits" className="hover:text-white">Benefits</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-accent-yellow">
                <li><a href="#" className="hover:text-white">About Us</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-accent-yellow">
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white">Compliance</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-accent-light border-opacity-20 text-center text-accent-yellow">
            <p>© 2024 AgroScore. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage; 