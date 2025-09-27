import React from 'react';

interface JobSearchForm {
  jobRole: string;
  experience: string;
  location: string;
  company?: string;
}

interface SearchFormProps {
  form: JobSearchForm;
  setForm: (form: JobSearchForm) => void;
  onSearch: () => void;
  loading: boolean;
}

export const SearchForm: React.FC<SearchFormProps> = ({ form, setForm, onSearch, loading }) => {
  return (
    <div className="search-form">
      <div className="form-row">
        <input
          type="text"
          placeholder="Job Role (e.g., Software Engineer)"
          value={form.jobRole}
          onChange={(e) => setForm({...form, jobRole: e.target.value})}
        />
        <select
          value={form.experience}
          onChange={(e) => setForm({...form, experience: e.target.value})}
        >
          <option value="">Select Experience</option>
          <option value="0-1">0-1 years</option>
          <option value="1-2">1-2 years</option>
          <option value="2-3">2-3 years</option>
          <option value="3-4">3-4 years</option>
          <option value="4-5">4-5 years</option>
        </select>
      </div>
      <div className="form-row">
        <input
          type="text"
          placeholder="Location (e.g., Mumbai, Delhi)"
          value={form.location}
          onChange={(e) => setForm({...form, location: e.target.value})}
        />
        <input
          type="text"
          placeholder="Company (optional)"
          value={form.company}
          onChange={(e) => setForm({...form, company: e.target.value})}
        />
      </div>
      <button 
        onClick={onSearch} 
        disabled={loading || !form.jobRole || !form.experience || !form.location}
        className="search-btn"
      >
        {loading ? 'Searching...' : 'Find Jobs'}
      </button>
    </div>
  );
};