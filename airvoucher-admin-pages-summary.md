# AirVoucher Admin Application - Pages Summary

## Overview

AirVoucher Admin is a comprehensive administrative dashboard for managing a voucher distribution platform. The application provides role-based access control with admin privileges, allowing system administrators to manage retailers, agents, vouchers, commissions, and view detailed reports.

## Authentication & Core Pages

### `/` (Root Page)

- **Purpose**: Landing page that automatically redirects to authentication
- **Functionality**:
  - Shows loading spinner while redirecting to `/auth`
  - Serves as the entry point for the admin application
- **Access**: Public (redirects to auth)

### `/auth` (Authentication Page)

- **Purpose**: Admin login interface
- **Functionality**:
  - Custom authentication component with role-based login
  - AirVoucher branding and logo display
  - Form validation and error handling
  - Redirects to admin dashboard upon successful authentication
- **Access**: Public (admin role required for login)

### `/404` (Not Found Page)

- **Purpose**: Custom 404 error page
- **Functionality**:
  - Displays debug information (path, hostname, router path)
  - Provides navigation back to home or previous page
  - Includes debug component for troubleshooting
- **Access**: Public (error page)

## Admin Dashboard

### `/admin` (Main Dashboard)

- **Purpose**: Central admin dashboard with business overview
- **Functionality**:
  - **Dashboard Stats**: Today's sales total, profit, active retailers, total retailers, agents count, sales count
  - **Charts**: Time series data visualization and voucher type breakdown
  - **Sales Table**: Filterable table of recent sales with retailer and voucher type filters
  - **Real-time Data**: Fetches data from multiple sources including retailers, sales, and commission data
- **Key Features**:
  - Role-based access control (admin only)
  - Loading states and error handling
  - Responsive design with modern UI components
- **Access**: Admin role required

### `/admin/profile` (Admin Profile)

- **Purpose**: Admin user profile management
- **Functionality**:
  - **Profile Display**: Shows admin name, email, phone, role, address, join date
  - **Recent Activity**: Displays recent admin actions (commission updates, voucher additions, report generation)
  - **Account Settings**: Two-factor authentication and notification preferences (placeholder functionality)
  - **Edit Profile**: Button for profile editing (placeholder)
- **Access**: Admin role required

## Retailer Management

### `/admin/retailers` (Retailers List)

- **Purpose**: Comprehensive retailer management interface
- **Functionality**:
  - **Retailer Table**: Displays all retailers with business name, contact info, location, agent, commission group, balance, status
  - **Add Retailer**: Modal dialog for creating new retailers with:
    - Business and contact information
    - Agent assignment
    - Commission group assignment
    - Initial balance and credit limit
    - Password generation (auto or manual)
  - **Actions**: Edit, view details, manage status
  - **Data Integration**: Fetches retailers, commission groups, and agents data
- **Key Features**:
  - Form validation and error handling
  - Password auto-generation
  - Real-time data updates
- **Access**: Admin role required

### `/admin/retailers/[id]` (Retailer Details)

- **Purpose**: Detailed view and management of individual retailers
- **Functionality**:
  - **Profile Card**: Complete retailer information with edit capabilities
  - **Financial Overview**: Balance, credit limit, commission balance display
  - **Terminals Section**: List of retailer terminals with status and management
  - **Sales History**: Detailed sales transactions for the retailer
  - **Modals**: Add terminal, commission group assignment, agent assignment, balance updates
- **Key Features**:
  - Expandable/collapsible sections
  - Real-time data updates
  - Comprehensive retailer management tools
- **Access**: Admin role required

## Agent Management

### `/admin/agents` (Agents List)

- **Purpose**: Agent management and assignment interface
- **Functionality**:
  - **Agent Table**: Lists all agents with name, email, phone, assigned retailers count, status
  - **Add Agent**: Modal for creating new agents with:
    - Personal information (name, email, phone)
    - Password generation
    - Retailer assignment (from unassigned retailers)
  - **Actions**: Edit, view details, manage assignments
  - **Data Integration**: Fetches agents and unassigned retailers
- **Key Features**:
  - Bulk retailer assignment during agent creation
  - Form validation and error handling
  - Real-time data updates
- **Access**: Admin role required

### `/admin/agents/[id]` (Agent Details)

- **Purpose**: Detailed agent profile and performance view
- **Functionality**:
  - **Agent Profile**: Complete agent information with status
  - **Assigned Retailers**: Table showing all retailers assigned to the agent
  - **Performance Metrics**: Retailer count, total balance, commission balance
  - **Retailer Management**: View and manage assigned retailers
- **Key Features**:
  - Comprehensive agent overview
  - Retailer relationship management
  - Performance tracking
- **Access**: Admin role required

## Voucher Management

### `/admin/vouchers` (Voucher Inventory Overview)

- **Purpose**: Central voucher inventory management hub
- **Functionality**:
  - **Inventory Summary**: Total available vouchers, total value, sold vouchers, disabled vouchers
  - **Voucher Type Cards**: Visual cards for each voucher type showing:
    - Provider logo and name
    - Available count and total value
    - Color-coded status indicators
    - Quick access to detailed management
  - **Category Organization**: Vouchers organized by type (airtime, data, entertainment, etc.)
  - **Upload Management**: Access to voucher upload functionality
- **Key Features**:
  - Visual inventory overview
  - Category-based organization
  - Quick navigation to detailed management
- **Access**: Admin role required

### `/admin/vouchers/[type]` (Voucher Type Details)

- **Purpose**: Detailed management of specific voucher types
- **Functionality**:
  - **Inventory Management**: View all vouchers of a specific type
  - **Grouped Display**: Vouchers grouped by amount for better overview
  - **Search & Filter**: Filter vouchers by amount
  - **Sorting**: Sort by amount, available count, sold count, inventory value
  - **Upload Vouchers**: Modal for uploading new vouchers to inventory
  - **Supplier Commission**: View and edit supplier commission rates
  - **Status Management**: Track available, sold, and disabled vouchers
- **Key Features**:
  - Advanced filtering and sorting
  - Bulk voucher upload
  - Commission rate management
  - Real-time inventory updates
- **Access**: Admin role required

### `/admin/voucher-test` (Voucher Testing)

- **Purpose**: Testing interface for voucher functionality
- **Functionality**: Placeholder page for voucher testing features
- **Access**: Admin role required

## Commission Management

### `/admin/commissions` (Commission Groups)

- **Purpose**: Commission rate management for retailers and agents
- **Functionality**:
  - **Commission Groups**: Create and manage commission groups
  - **Rate Management**: Set retailer and agent commission percentages for each voucher type
  - **Categorized Vouchers**: Vouchers organized by category for easier rate setting
  - **Bulk Operations**: Create new groups with predefined rates
  - **Real-time Editing**: Inline editing of commission rates
- **Key Features**:
  - Percentage-based commission calculation
  - Category-based voucher organization
  - Validation and error handling
  - Real-time updates
- **Access**: Admin role required

## Reports & Analytics

### `/admin/reports` (Reports Hub)

- **Purpose**: Central hub for accessing various business reports
- **Functionality**:
  - **Report Cards**: Visual cards for different report types:
    - Sales Report: Comprehensive sales transactions
    - Earnings Summary: Platform and agent commissions
    - Inventory Report: Stock levels and valuation
    - Voucher Performance: Sales analysis by provider
    - Agent Performance: Agent performance metrics
  - **Recently Generated**: Section for recently created reports (placeholder)
  - **Coming Soon**: All reports marked as "coming soon" with info notifications
- **Key Features**:
  - Animated card interactions
  - Organized report categories
  - Future-ready structure
- **Access**: Admin role required

## Technical Architecture

### Authentication & Authorization

- **Role-based Access Control**: Admin role required for all admin pages
- **Custom Auth Component**: Handles authentication with Supabase
- **Route Protection**: `useRequireRole` hook protects all admin routes
- **Session Management**: Automatic redirects based on authentication status

### Data Management

- **Supabase Integration**: All data operations use Supabase client
- **Real-time Updates**: Data refreshes automatically after operations
- **Error Handling**: Comprehensive error states and user feedback
- **Loading States**: Proper loading indicators throughout the application

### UI/UX Features

- **Modern Design**: Clean, professional interface using Tailwind CSS
- **Responsive Layout**: Works on desktop and mobile devices
- **Interactive Components**: Modals, dialogs, expandable sections
- **Visual Feedback**: Loading states, success/error messages, animations
- **Accessibility**: Proper ARIA labels and keyboard navigation

### State Management

- **React Hooks**: Uses useState, useEffect for local state management
- **Form Handling**: Controlled components with validation
- **Data Fetching**: Custom hooks and action functions for data operations
- **Error Boundaries**: Error handling at component level

## Navigation Structure

```
/admin
├── / (dashboard)
├── /profile
├── /retailers
│   ├── / (list)
│   └── /[id] (details)
├── /agents
│   ├── / (list)
│   └── /[id] (details)
├── /vouchers
│   ├── / (overview)
│   ├── /[type] (details)
│   └── /voucher-test
├── /commissions
└── /reports
```

## Key Business Functions

1. **User Management**: Create and manage retailers and agents
2. **Inventory Control**: Upload and manage voucher inventory
3. **Commission Structure**: Set up commission rates and groups
4. **Financial Tracking**: Monitor balances, sales, and profits
5. **Reporting**: Generate business insights and analytics
6. **System Administration**: Profile management and system settings

This admin application serves as the central control panel for the AirVoucher platform, providing comprehensive management capabilities for all aspects of the voucher distribution business.
