import React from 'react';

const Footer: React.FC = () => (
  <footer className="w-full bg-gray-100 border-t border-gray-200 py-4 mt-8">
    <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between text-sm text-gray-600">
      <span>© {new Date().getFullYear()} Team Management App. All rights reserved.</span>
      <a
        href="#"
        className="text-blue-600 hover:underline mt-2 md:mt-0"
        target="_blank"
        rel="noopener noreferrer"
      >
        Visit our website
      </a>
    </div>
  </footer>
);

export default Footer; 