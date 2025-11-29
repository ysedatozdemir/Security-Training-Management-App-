# Security Student Management System

A comprehensive student management system designed for security and firearms training institutions in Turkey. The system manages student enrollment, training programs, document tracking, payment processing, and compliance with Turkish regulations.

## Overview

This desktop application is built using Electron and provides a complete solution for managing students through specialized training programs, including first-time training (İlk Defa) and renewal training (Yenileme) programs.

## Features

### Student Management
- Complete student information tracking with Turkish TC ID validation
- Dual training type support (İlk Defa and Yenileme)
- Duplicate detection system
- Student status tracking and management
- Advanced search and filtering capabilities

### Term Management
- Training term creation and scheduling
- Capacity management and enrollment tracking
- Term status monitoring (Active, Completed, Upcoming)
- Automatic term completion handling

### Document Management
- Tracking of 9 required documents per student
- Automated document completion percentage calculation
- Document status monitoring (Tamamlandı/Eksik/Beklemede)
- Visual progress indicators

### Payment Management
- Payment tracking and balance calculations
- Installment support
- Payment history and receipt generation
- Automated financial reporting

### Dashboard & Reporting
- Real-time statistics and metrics
- Visual data representation
- Student distribution analysis
- Financial overview
- Document completion tracking

## Technical Requirements

### System Requirements
- Operating System: Windows, macOS, or Linux
- Node.js 14.x or higher
- Electron 13.x or higher

### Data Types Handled
- **Text Data**: Student information, credentials, addresses
- **Numeric Data**: Fees, payments, scores, ID numbers
- **Date/Time**: Term dates, enrollment dates, timestamps
- **Boolean**: Document status, licensing status
- **Categorical**: Training types, student status, payment methods

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/student-management-system.git
cd student-management-system
```

2. Install dependencies:
```bash
npm install
```

3. Run the application:
```bash
npm start
```

## Project Structure

```
student-management-system/
├── index.html              # Main dashboard interface
├── donem-detay.html        # Term details page
├── main.js                 # Electron main process
├── preload.js              # Electron preload script
├── default.js              # Core application logic
├── student-edit.js         # Student editing functionality
├── student-utils.js        # Student utility functions
├── notifications-page.js   # Notifications system
└── default.css             # Application styling
```

## Key Modules

### 1. Term Management Module
- Term creation and editing
- Capacity tracking
- Student enrollment management
- Term lifecycle management

### 2. Student Management Module
- Student registration and profile management
- TC ID validation algorithm
- Training type assignment
- Status tracking

### 3. Payment Management Module
- Fee calculation and tracking
- Payment processing
- Balance management
- Financial reporting

### 4. Document Management Module
- Document requirement tracking
- Completion status monitoring
- Progress calculation
- Document verification

### 5. Dashboard & Reporting Module
- Statistical analysis
- Visual data representation
- Report generation
- Performance metrics

## Data Validation

### TC ID Validation
The system implements the official Turkish TC ID validation algorithm:
- 11-digit numeric validation
- First digit cannot be 0
- 10th digit verification: (sum of odd positions * 7 - sum of even positions) mod 10
- 11th digit verification: sum of first 10 digits mod 10

## Development Team

This project is developed as part of an academic course by a three-person development team:
- Module ownership and responsibility division
- Collaborative documentation and UML diagram creation
- Comprehensive technical analysis and reporting

## Academic Documentation

The project includes complete UML documentation:
- Use Case Diagrams
- Data Flow Diagrams (Context and Level 1)
- System architecture documentation
- Computational requirement analysis

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

This is an academic project. For questions or suggestions, please contact the development team.

## Acknowledgments

- Developed for Turkish security and firearms training institutions
- Compliant with Turkish regulatory requirements
- Built with modern web technologies and Electron framework
