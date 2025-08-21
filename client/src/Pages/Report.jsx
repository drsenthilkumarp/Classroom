import React from 'react';
import { useParams } from 'react-router-dom';
import MentorNav from '../Components/MentorNav';

const styles = `
  .page-container {
    background-color: #d3d8e0;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    position: relative;
  }

  .card-container {
    background-color: #fff;
    border-radius: 1rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 700px;
    padding: 0 2rem 2rem 2rem;
    margin-top: 4.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .second-nav {
    background-color: #fff;
    border-top-left-radius: 1rem;
    border-top-right-radius: 1rem;
    padding: 0rem 0;
    margin: 0 -2rem;
  }

  .class-name {
    font-size: 2.5rem;
    font-weight: 800;
    color: #6b48ff;
    margin-bottom: 0.2rem;
    text-align: center;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 1rem;
  }

  .form-group label {
    font-weight: 600;
    margin-bottom: 4px;
  }

  .form-group select {
    padding: 10px;
    border-radius: 8px;
    border: 1px solid #ccc;
    font-size: 1rem;
  }

  .download-btn {
    background-color: #6b48ff;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    margin-top: 1rem;
    align-self: center;
  }

  .download-btn:hover {
    background-color: #5938cc;
  }

  @media (max-width: 768px) {
    .card-container {
      padding: 0 1rem 1rem 1rem;
      margin-top: 0.5rem;
    }

    .second-nav {
      margin: 0 -1rem;
      padding: 0.75rem 0;
    }

    .class-name {
      font-size: 1.8rem;
    }
  }
`;

const Report = () => {
  const { classId } = useParams();

  return (
    <>
      <style>{styles}</style>
      <div className="page-container">
        <div className="card-container">
          <div className="second-nav">
            <MentorNav classId={classId} />
          </div>
          <h1 className="class-name">Report</h1>

          <div className="form-group">
            <label>Department</label>
            <select defaultValue="">
              <option value="" disabled>Select Department</option>
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
              <option value="EEE">EEE</option>
              <option value="MECH">MECH</option>
              <option value="CIVIL">CIVIL</option>
              <option value="IT">IT</option>
            </select>

            <label>Year</label>
            <select defaultValue="">
              <option value="" disabled>Select Year</option>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>

            <label>Details</label>
            <select defaultValue="">
              <option value="" disabled>Select Detail Type</option>
              <option>Personal Details</option>
              <option>Skills</option>
              <option>Paper Presentations</option>
              <option>Publications</option>
              <option>Patents</option>
              <option>Entrepreneurship</option>
              <option>Placement</option>
              <option>Project Details</option>
              <option>Competitions</option>
              <option>Internship</option>
              <option>Online Course</option>
              <option>Product Development</option>
            </select>

            <button className="download-btn">Download Report</button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Report;
