import React, { useState } from 'react';

interface CreditInputs {
  name: string;
  landQuality: string;
  farmSize: string;
  cropType: string;
  loanHistory: string;
  income: string;
  marketValue: string;
  latitude: string;
  longitude: string;
}

const CreditScoreCalculator: React.FC = () => {
  const [creditInputs, setCreditInputs] = useState<CreditInputs>({
    name: '',
    landQuality: '',
    farmSize: '',
    cropType: '',
    loanHistory: '',
    income: '',
    marketValue: '',
    latitude: '',
    longitude: ''
  });

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [creditScore, setCreditScore] = useState<number | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCreditInputs(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch('http://localhost:3001/api/calculate-credit-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(creditInputs)
      });

      if (!response.ok) {
        throw new Error('Failed to calculate credit score');
      }

      const data = await response.json();
      setCreditScore(data.creditScore);
      setSuccessMessage('Credit score calculated successfully!');
    } catch (error) {
      console.error('Error calculating credit score:', error);
      setErrorMessage('Failed to calculate credit score. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generatePDFReport = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/generate-credit-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(creditInputs)
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF report');
      }

      // Get the filename from the Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : 'credit-report.pdf';

      // Create a blob from the response
      const blob = await response.blob();
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL
      window.URL.revokeObjectURL(url);

      setSuccessMessage('PDF report generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      setErrorMessage('Failed to generate PDF report. Please try again.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Credit Score Calculator</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Name
          </label>
          <input
            type="text"
            name="name"
            value={creditInputs.name}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Land Quality Score (0-100)</label>
          <input
            type="number"
            name="landQuality"
            value={creditInputs.landQuality}
            onChange={handleInputChange}
            min="0"
            max="100"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Farm Size (acres)</label>
          <input
            type="number"
            name="farmSize"
            value={creditInputs.farmSize}
            onChange={handleInputChange}
            min="0"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Crop Type</label>
          <select
            name="cropType"
            value={creditInputs.cropType}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            required
          >
            <option value="">Select a crop</option>
            <option value="wheat">Wheat</option>
            <option value="rice">Rice</option>
            <option value="cotton">Cotton</option>
            <option value="sugarcane">Sugarcane</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Loan History Score (0-100)</label>
          <input
            type="number"
            name="loanHistory"
            value={creditInputs.loanHistory}
            onChange={handleInputChange}
            min="0"
            max="100"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Annual Income (₹)</label>
          <input
            type="number"
            name="income"
            value={creditInputs.income}
            onChange={handleInputChange}
            min="0"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Farm Market Value (₹)</label>
          <input
            type="number"
            name="marketValue"
            value={creditInputs.marketValue}
            onChange={handleInputChange}
            min="0"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Latitude</label>
          <input
            type="number"
            name="latitude"
            value={creditInputs.latitude}
            onChange={handleInputChange}
            step="any"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Longitude</label>
          <input
            type="number"
            name="longitude"
            value={creditInputs.longitude}
            onChange={handleInputChange}
            step="any"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors"
          disabled={loading}
        >
          {loading ? 'Calculating...' : 'Calculate Credit Score'}
        </button>
      </form>

      {errorMessage && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mt-4 p-3 bg-green-100 text-green-700 rounded">
          {successMessage}
        </div>
      )}

      {creditScore !== null && (
        <div className="mt-6 p-4 bg-green-50 rounded">
          <h3 className="text-xl font-bold mb-2">Credit Score:</h3>
          <p className="text-4xl font-bold text-green-600">{creditScore}</p>
          <button
            onClick={generatePDFReport}
            className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
          >
            <span className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Detailed Report
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export default CreditScoreCalculator; 