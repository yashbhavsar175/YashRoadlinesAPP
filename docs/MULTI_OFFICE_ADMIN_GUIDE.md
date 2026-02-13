# Multi-Office Support - Admin User Guide

## Overview

The Multi-Office Support feature allows YashRoadlines to manage multiple office locations (e.g., "Prem Darvaja Office" and "Aslali Office") within a single application. As an admin, you have full control over office management, user assignments, and can view data across all offices.

## Table of Contents

1. [Office Management](#office-management)
2. [User Assignment](#user-assignment)
3. [Office Switching](#office-switching)
4. [Viewing Consolidated Data](#viewing-consolidated-data)
5. [Best Practices](#best-practices)

---

## Office Management

### Accessing Office Management

1. Log in with your admin credentials
2. Navigate to **Settings** or **Admin Menu**
3. Select **Office Management**

### Creating a New Office

1. In the Office Management screen, tap **"+ Create Office"**
2. Enter the following details:
   - **Office Name**: Must be unique (e.g., "Aslali Office")
   - **Address**: Optional but recommended for clarity
3. Tap **"Save"**
4. The new office will appear in the office list immediately

**Important Notes:**
- Office names must be unique (case-insensitive)
- Whitespace is automatically trimmed from office names
- Once created, the office is immediately available for user assignment

### Editing an Office

1. In the Office Management screen, find the office you want to edit
2. Tap the **Edit** icon (pencil) next to the office name
3. Modify the office name or address
4. Tap **"Save"**
5. Changes are reflected immediately across the application

**Important Notes:**
- When editing an office name, it must still be unique
- Existing transactions remain associated with the office (using office ID)

### Deleting an Office

1. In the Office Management screen, find the office you want to delete
2. Tap the **Delete** icon (trash) next to the office name
3. A confirmation dialog will appear
4. If the office has associated transactions, deletion will be **blocked** with an error message
5. If the office has no transactions, confirm deletion

**Important Notes:**
- You cannot delete an office that has transactions
- You cannot delete an office that has assigned users
- To delete an office, first reassign all users and ensure no transactions exist
- Deleted offices cannot be recovered

---

## User Assignment

### Assigning Office During User Creation

1. Navigate to **User Access Management**
2. Tap **"+ Create User"**
3. Fill in user details (name, phone, role, etc.)
4. **Select Office**: Choose from the dropdown list of available offices
5. Tap **"Save"**

**Important Notes:**
- Office assignment is **required** during user creation
- Users can only be assigned to one office at a time
- Regular users will only see data from their assigned office

### Changing User's Office Assignment

1. Navigate to **User Access Management**
2. Find the user whose office you want to change
3. Tap the **Edit** icon next to the user
4. Select a new office from the dropdown
5. Tap **"Save"**
6. The user will see data from the new office on their next login

**Important Notes:**
- Changing a user's office does not move their historical transactions
- Historical transactions remain in the original office
- The user will only see new office data going forward

### Viewing User Office Assignments

In the User Access Management screen, each user's assigned office is displayed next to their name and role:

```
John Doe | Admin | Prem Darvaja Office
Jane Smith | Majur | Aslali Office
```

---

## Office Switching

### How to Switch Offices

As an admin, you can switch between offices to view and manage data for different locations:

1. Look at the **header** of any screen
2. You'll see your name, role, and current office with a dropdown arrow: `[Name | Role | Office ▼]`
3. Tap the **office dropdown**
4. Select the office you want to view
5. The screen will reload with data from the selected office (takes ~2 seconds)

### Office Switching Behavior

- **Current Office Indicator**: Always visible in the header
- **Data Reload**: All screens automatically reload with the new office's data
- **Persistence**: Your last selected office is remembered for next login
- **Speed**: Office switching completes within 2 seconds

### "All Offices" View

1. Tap the office dropdown in the header
2. Select **"All Offices"**
3. The screen will display aggregated data from all offices
4. Reports will show office-wise breakdowns

**Available in "All Offices" View:**
- Consolidated daily reports
- Monthly statements with office breakdowns
- Total revenue/expense across all offices
- Office-wise comparisons

---

## Viewing Consolidated Data

### Daily Reports

When viewing daily reports in "All Offices" mode:
- Transactions are grouped by office
- Each office section shows its own totals
- A grand total is displayed at the bottom
- PDF exports include office information

### Monthly Statements

When viewing monthly statements in "All Offices" mode:
- Data is broken down by office
- Each office has its own section with totals
- Comparative metrics show performance across offices
- You can see which office is performing better

### PDF Reports

All PDF reports include office information:
- **Header**: Shows which office the report is for
- **Consolidated Reports**: Include office-wise breakdowns
- **Transaction Details**: Each transaction shows its office
- **Totals**: Calculated per office and overall

---

## Best Practices

### Office Naming

- Use clear, descriptive names (e.g., "Prem Darvaja Office", not "Office 1")
- Include location information in the name
- Keep names concise but meaningful
- Use consistent naming conventions

### User Assignment

- Assign users to their primary work location
- Review user assignments regularly
- Update assignments when users change locations
- Don't create duplicate users for different offices

### Data Management

- Switch to the correct office before creating transactions
- Verify the office indicator before saving important data
- Use "All Offices" view for comparative analysis
- Regularly review data across all offices

### Office Creation

- Create offices before assigning users
- Set up the default office first ("Prem Darvaja Office")
- Add address information for clarity
- Test with a few transactions before full rollout

### Reporting

- Use office-specific view for detailed analysis
- Use "All Offices" view for high-level overview
- Export PDF reports with office information
- Compare performance across offices regularly

---

## Troubleshooting

### Cannot Delete Office

**Problem**: Error message when trying to delete an office

**Solution**: 
- Check if the office has associated transactions
- Check if users are assigned to the office
- Reassign users to another office first
- Contact support if transactions need to be moved

### User Cannot See Data

**Problem**: User reports not seeing any data after login

**Solution**:
- Verify the user is assigned to an office
- Check if the office has any transactions
- Ensure the user has proper screen access permissions
- Verify the office is marked as active

### Office Switching Not Working

**Problem**: Data doesn't reload after switching offices

**Solution**:
- Check internet connection
- Try closing and reopening the app
- Verify you have admin permissions
- Check if the office is active

### Duplicate Office Name Error

**Problem**: Cannot create office with desired name

**Solution**:
- Check if an office with that name already exists (case-insensitive)
- Try a slightly different name
- Check for extra spaces in the name
- Use the office list to see existing names

---

## Support

For additional help or questions about multi-office support:
- Contact your system administrator
- Refer to the technical documentation
- Check the user guide for regular users
- Review the database schema documentation

---

**Last Updated**: February 2026  
**Version**: 1.0
