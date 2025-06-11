import React, { useState, useRef } from 'react';
import { Home, Archive, AlignJustify, X, Users, UserCheck, Settings, GraduationCap, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useSidebar } from '../context/SidebarContext';

const styles = `
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    background-color: #fff;
    backdrop-blur-lg;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease-in-out;
    z-index: 30;
    width: 80px;
    overflow: hidden;
    display: none;
  }

  @media (min-width: 768px) {
    .sidebar {
      display: block;
    }
    .sidebar:hover {
      width: 256px;
    }
  }

  .menu-button {
    padding: 1.25rem;
    display: flex;
    justify-content: center;
    transition: all 0.3s ease-in-out;
  }

  .sidebar.open .menu-button,
  .sidebar:hover .menu-button {
    justify-content: flex-end;
  }

  .menu-icon {
    color: #374151;
    transition: all 0.3s ease-in-out;
  }

  .menu-button:hover .menu-icon {
    color: #3b82f6;
    cursor: pointer;
  }

  .menu-icon-open {
    animation: rotateToCross 0.3s ease-in-out forwards;
  }

  .menu-icon-close {
    animation: rotateToHamburger 0.3s ease-in-out forwards;
  }

  @keyframes rotateToCross {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(90deg);
    }
  }

  @keyframes rotateToHamburger {
    0% {
      transform: rotate(90deg);
    }
    100% {
      transform: rotate(0deg);
    }
  }

  .classroom-name {
    padding: 1rem 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6b7280;
    font-size: 1rem;
    font-weight: 600;
    text-align: center;
  }

  .sidebar:hover .classroom-name,
  .sidebar.open .classroom-name {
    justify-content: flex-start;
  }

  .horizontal-line {
    width: 80%;
    height: 1px;
    background-color: #e5e7eb;
    margin: 0 auto;
  }

  .nav-links {
    display: flex;
    flex-direction: column;
    padding: 1.5rem 0.75rem;
    gap: 0.5rem;
    height: calc(100vh - 120px);
    justify-content: space-between;
  }

  .nav-item {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 0.75rem;
    color: #000000;
    border-radius: 0.5rem;
    transition: all 0.3s ease-in-out;
    position: relative;
  }

  .nav-item:hover {
    background-color: #f3f4f6;
    color: #000000;
    cursor: pointer;
  }

  .nav-item.active {
    background-color: #e5e7eb;
    color: #3b82f6;
    border-left: 4px solid #3b82f6;
  }

  .nav-item.settings {
    margin-bottom: -30px;
  }

  .nav-icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
  }

  .nav-text {
    margin-left: 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    opacity: 0;
    transition: opacity 0.3s ease-in-out;
  }

  .sidebar:hover .nav-text,
  .sidebar.open .nav-text {
    opacity: 1;
  }

  .nav-item::before {
    content: attr(data-tooltip);
    position: absolute;
    left: 100%;
    top: 50%;
    transform: translateY(-50%);
    background-color: #333;
    color: #fff;
    padding: 5px 10px;
    border-radius: 5px;
    font-size: 0.75rem;
    font-weight: 400;
    white-space: nowrap;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s ease-in-out;
    z-index: 10;
    margin-left: 10px;
  }

  .nav-item::after {
    content: '';
    position: absolute;
    left: 100%;
    top: 50%;
    transform: translateY(-50%);
    border-width: 5px;
    border-style: solid;
    border-color: transparent #333 transparent transparent;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s ease-in-out;
  }

  .nav-item:hover::before,
  .nav-item:hover::after {
    opacity: 1;
    visibility: visible;
  }

  .backdrop {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.3);
    z-index: 20;
    display: none;
  }

  @media (max-width: 767px) {
    .backdrop.open {
      display: block;
    }
  }
`;

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  const userMenuRef = useRef();
  const user = useSelector((state) => state.auth.user);
  const userRole = user?.role;
  const { setIsSidebarHovered } = useSidebar();
  const classroomName = useSelector((state) => state.classroom?.name) || "Classroom";

  const handleNavigation = (path, tooltip) => {
    console.log('Navigating to:', path, 'User:', { email: user?.email, role: userRole });
    navigate(path);
  };

  const toggleSidebar = () => {
    console.log('Toggling sidebar. Current isOpen:', isOpen);
    setIsOpen(prev => !prev);
    console.log('New isOpen:', !isOpen);
  };

  const handleMouseEnter = () => {
    console.log('Mouse entered sidebar');
    setIsHovered(true);
    setIsSidebarHovered(true);
  };

  const handleMouseLeave = () => {
    console.log('Mouse left sidebar');
    setIsHovered(false);
    setIsSidebarHovered(false);
  };

  return (
    <>
      <style>{styles}</style>
      <div
        className={`sidebar ${isOpen ? 'open' : ''}`}
        ref={userMenuRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="menu-button">
          <button onClick={toggleSidebar}>
            {(isOpen || isHovered) ? (
              <X size={24} className={`menu-icon ${isOpen || isHovered ? 'menu-icon-open' : 'menu-icon-close'}`} />
            ) : (
              <AlignJustify size={24} className={`menu-icon ${isOpen || isHovered ? 'menu-icon-open' : 'menu-icon-close'}`} />
            )}
          </button>
        </div>

        <nav className="nav-links">
          <div className="top-links">
            <div
              className={`nav-item ${window.location.pathname === "/home" ? "active" : ""}`}
              onClick={() => handleNavigation("/home", "View all classrooms")}
              data-tooltip="View all classrooms"
            >
              <Home size={20} className="nav-icon" />
              <span className="nav-text">Classroom</span>
            </div>
            {['admin', 'super admin'].includes(userRole) && (
              <>
                <div
                  className={`nav-item ${window.location.pathname === '/admin/students' ? 'active' : ''}`}
                  onClick={() => handleNavigation('/admin/students', "Manage student records")}
                  data-tooltip="Manage student records"
                >
                  <Users size={20} className="nav-icon" />
                  <span className="nav-text">Student</span>
                </div>
                <div
                  className={`nav-item ${window.location.pathname === '/admin/faculty' ? 'active' : ''}`}
                  onClick={() => handleNavigation('/admin/faculty', "Manage faculty members")}
                  data-tooltip="Manage faculty members"
                >
                  <GraduationCap size={20} className="nav-icon" />
                  <span className="nav-text">Faculty</span>
                </div>
                <div
                  className={`nav-item ${window.location.pathname === '/admin/mentor' ? 'active' : ''}`}
                  onClick={() => handleNavigation('/admin/mentor', "Manage mentors")}
                  data-tooltip="Manage mentors"
                >
                  <UserCheck size={20} className="nav-icon" />
                  <span className="nav-text">Mentor</span>
                </div>
              </>
            )}
          </div>
          <div className="bottom-links">
            {['admin', 'super admin'].includes(userRole) && (
              <div
                className={`nav-item ${window.location.pathname === '/admin/archived' ? 'active' : ''}`}
                onClick={() => handleNavigation('/admin/archived', "View archived classes")}
                data-tooltip="View archived classes"
              >
                <Archive size={20} className="nav-icon" />
                <span className="nav-text">Archived Class</span>
              </div>
            )}
            {userRole === 'super admin' && (
              <div
                className={`nav-item ${window.location.pathname === '/admin/userdetails' ? 'active' : ''}`}
                onClick={() => handleNavigation('/admin/userdetails', "View user details")}
                data-tooltip="View user details"
              >
                <Info size={20} className="nav-icon" />
                <span className="nav-text">User Details</span>
              </div>
            )}
            <div
              className={`nav-item settings ${window.location.pathname === '/admin/setting' ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/setting', "Adjust application settings")}
              data-tooltip="Adjust application settings"
            >
              <Settings size={20} className="nav-icon" />
              <span className="nav-text">Settings</span>
            </div>
          </div>
        </nav>
      </div>

      {isOpen && (
        <div
          className={`backdrop ${isOpen ? 'open' : ''}`}
          onClick={toggleSidebar}
        />
      )}
    </>
  );
};

export default Sidebar;