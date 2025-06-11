import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import MentorNav from '../Components/MentorNav'; // Adjust path based on your project structure

const styles = `
  /* Page Background */
  .page-container {
    background-color: #d3d8e0;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    position: relative;
  }

  /* Card Container for all content */
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

  /* Style for MentorNav to merge with the top of the card */
  .second-nav {
    background-color: #fff;
    border-top-left-radius: 1rem;
    border-top-right-radius: 1rem;
    padding: 0rem 0;
    margin: 0 -2rem;
  }

  /* Headings */
  .class-name {
    font-size: 2.5rem;
    font-weight: 800;
    color: #6b48ff;
    margin-bottom: 0.2rem;
    text-align: center;
  }

  .section-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #000;
    margin-bottom: 1rem;
    text-align: left;
  }

  /* Form Styles */
  .form-container {
    width: 100%;
    padding: 1.5rem;
    background-color: transparent;
    border: none;
    box-shadow: none;
  }

  .form-label {
    display: block;
    font-size: 1.1rem;
    font-weight: 600;
    color: #000;
    margin-bottom: 0.5rem;
  }

  .form-input {
    width: 100%;
    padding: 0.75rem;
    background-color: #fff;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-size: 1rem;
    color: #333;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .form-input:focus {
    outline: none;
    border-color: #6b48ff;
    box-shadow: 0 0 0 3px rgba(107, 72, 255, 0.2);
  }

  .form-input::placeholder {
    color: #999;
    font-style: italic;
  }

  .form-button {
    padding: 0.75rem 1.5rem;
    background-color: #6b48ff;
    color: #fff;
    border: none;
    border-radius: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s, transform 0.2s;
  }

  .form-button:hover {
    background-color: #5a3de6;
    cursor: pointer;
    transform: scale(1.02);
  }

  .form-button:disabled {
    background-color: #a3a3a3;
    cursor: not-allowed;
  }

  .button-row {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: 1.5rem;
  }

  /* Classmates List Styles */
  .classmates-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .classmates-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #000;
  }

  .student-count {
    font-size: 1rem;
    font-weight: 500;
    color: #666;
  }

  .classmates-list {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .classmate-item {
    display: flex;
    align-items: center;
    padding: 0.75rem 0;
    border-bottom: 1px solid #e5e7eb;
  }

  .classmate-email {
    font-size: 1rem;
    font-weight: 500;
    color: #333;
    flex: 1;
  }

  .delete-button {
    color: #dc3545;
    transition: color 0.2s, transform 0.2s;
  }

  .delete-button:hover {
    color: #b02a37;
    cursor: pointer;
    transform: scale(1.1);
  }

  /* Notification Modal */
  .notification-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: #fff;
    color: #000;
    padding: 1.5rem;
    border-radius: 0.5rem;
    box-shadow: 0 0 15px 5px rgba(107, 72, 255, 0.3),
                0 0 15px 5px rgba(0, 122, 255, 0.3);
    text-align: center;
    z-index: 1000;
    animation: fadeIn 0.3s ease-in-out;
  }

  .notification-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  .notification-message {
    font-size: 1rem;
    font-weight: 400;
  }

  .notification-success .notification-title,
  .notification-success .notification-message {
    color: #28a745;
  }

  .notification-error .notification-title,
  .notification-error .notification-message {
    color: #dc3545;
  }

  /* Animations */
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translate(-50%, -60%);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%);
    }
  }

  /* No Data Message */
  .no-data {
    text-align: center;
    color: #666;
    font-size: 1.1rem;
    margin-top: 2rem;
  }

  /* Loading Spinner */
  .spinner {
    width: 4rem;
    height: 4rem;
    border: 4px solid #6b48ff;
    border-top: 4px solid transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .card-container {
      padding: 0 1rem 1rem 1rem;
      margin-top: 0.5rem;
    }

    .second-nav {
      margin: 0 -<|control9|>rem;
      padding: 0.75rem 0;
    }

    .class-name {
      font-size: 1.8rem;
    }

    .classmate-email {
      font-size: 0.9rem;
    }
  }
`;

const AddStudentMentor = () => {
  const { classId } = useParams();
  const effectRan = useRef(false);
  const [students, setStudents] = useState([]);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Placeholder class data (simulating backend response)
  const classData = { ClassName: 'Mentor Class' };

  // Load students from localStorage on mount
  useEffect(() => {
    if (effectRan.current === false) {
      const savedStudents = JSON.parse(localStorage.getItem('students')) || [];
      setStudents(savedStudents);
    }
    return () => {
      effectRan.current = true;
    };
  }, []);

  // Save students to localStorage whenever the list changes
  useEffect(() => {
    localStorage.setItem('students', JSON.stringify(students));
  }, [students]);

  const showNotification = (title, message, type) => {
    setNotification({ title, message, type });
    setTimeout(() => setNotification(null), 2000);
  };

  // Generate random student details
  const generateRandomDetails = (email) => {
    const names = [
      'Arun Kumar', 'Priya Sharma', 'Vikram Singh', 'Sneha Patel', 
      'Rahul Verma', 'Anjali Nair', 'Karthik Reddy', 'Meera Joshi'
    ];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomMobile = `+91${Math.floor(9000000000 + Math.random() * 1000000000)}`;
    const randomPhoto = `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'men' : 'women'}/${Math.floor(Math.random() * 100)}.jpg`;

    return {
      email,
      name: randomName,
      mobile: randomMobile,
      photo: randomPhoto
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      showNotification('Error', 'Please enter an email address.', 'error');
      return;
    }
    if (!email.endsWith('@bitsathy.ac.in')) {
      showNotification('Error', 'Email must be from @bitsathy.ac.in domain.', 'error');
      return;
    }

    // Simulate adding a student
    setIsLoading(true);
    setTimeout(() => {
      // Check for duplicate email
      if (students.some(student => student.email.toLowerCase() === email.toLowerCase())) {
        showNotification('Error', 'Student already exists.', 'error');
      } else {
        const newStudent = generateRandomDetails(email);
        setStudents([...students, newStudent]);
        setEmail('');
        showNotification('Success', 'Student added successfully', 'success');
      }
      setIsLoading(false);
    }, 1000); // Simulate network delay
  };

  const handleDelete = (studentEmail) => {
    // Simulate deleting a student
    setIsLoading(true);
    setTimeout(() => {
      setStudents(students.filter(student => student.email !== studentEmail));
      showNotification('Success', 'Student deleted successfully', 'success');
      setIsLoading(false);
    }, 1000); // Simulate network delay
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center mt-10">{error}</div>;
  }

  return (
    <div className="page-container">
      <style>{styles}</style>

      <div className="card-container">
        <div className="second-nav">
          <MentorNav classId={classId} />
        </div>
        <h2 className="class-name">{classData ? classData.ClassName : 'No class data available'}</h2>

        <form className="form-container" onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="form-label">Student Email:</label>
            <input
              type="email"
              placeholder="Email should be @bitsathy domain only"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="button-row">
            <button type="submit" className="form-button" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Student'}
            </button>
          </div>
        </form>

        <div className="w-full">
          <div className="classmates-header">
            <h3 className="classmates-title">Students List</h3>
            <span className="student-count">{students.length} students</span>
          </div>

          {students.length === 0 ? (
            <div className="no-data">
              <p>No students found. Add a student above.</p>
            </div>
          ) : (
            <div className="classmates-list">
              {students.map((student, index) => (
                <div key={index} className="classmate-item">
                  <span className="classmate-email">{student.email}</span>
                  <button onClick={() => handleDelete(student.email)} className="delete-button">
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {notification && (
        <div className={`notification-modal notification-${notification.type}`}>
          <div className="notification-title">{notification.title}</div>
          <div className="notification-message">{notification.message}</div>
        </div>
      )}
    </div>
  );
};

export default AddStudentMentor;