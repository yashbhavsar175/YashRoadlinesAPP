# Multi-Office Support - Workflow Documentation

## Overview

This document describes the complete workflows for managing and using the multi-office support feature in the YashRoadlines application.

## Table of Contents

1. [Initial Setup Workflow](#initial-setup-workflow)
2. [Office Management Workflows](#office-management-workflows)
3. [User Management Workflows](#user-management-workflows)
4. [Daily Operations Workflows](#daily-operations-workflows)
5. [Reporting Workflows](#reporting-workflows)

---

## Initial Setup Workflow

### Setting Up Multi-Office Support (First Time)

**Prerequisites:**
- Database migrations applied (009, 010, 011, 012, 013)
- Default office "Prem Darvaja Office" created
- All existing data migrated to default office

**Steps:**

1. **Verify Default Office**
   - Log in as admin
   - Navigate to Office Management
   - Confirm "Prem Darvaja Office" exists
   - Verify all existing users are assigned to default office

2. **Create Additional Offices**
   - Tap "+ Create Office"
   - Enter office name (e.g., "Aslali Office")
   - Enter address (optional but recommended)
   - Tap "Save"
   - Repeat for each additional office

3. **Assign Users to Offices**
   - Navigate to User Access Management
   - For each user, tap Edit
   - Select appropriate office from dropdown
   - Tap "Save"
   - Verify office assignment appears next to user name

4. **Test Office Switching**
   - As admin, tap office dropdown in header
   - Select different office
   - Verify data reloads (should show empty or different data)
   - Switch back to default office
   - Verify original data appears

5. **Create Test Transactions**
   - Switch to "Aslali Office"
   - Create a test general entry
   - Switch to "Prem Darvaja Office"
   - Verify test entry is not visible
   - Switch back to "Aslali Office"
   - Verify test entry is visible

---

## Office Management Workflows

### Creating a New Office

**Actor:** Admin

**Steps:**

1. Log in with admin credentials
2. Navigate to **Settings** → **Office Management**
3. Tap **"+ Create Office"** button
4. Fill in office details:
   - **Office Name**: Enter unique name (e.g., "Narol Office")
   - **Address**: Enter physical address (optional)
5. Tap **"Save"**
6. Verify success message appears
7. Verify new office appears in office list
8. Verify new office appears in office dropdown (header)

**Validation:**
- Office name must be unique (case-insensitive)
- Office name cannot be empty
- Whitespace is automatically trimmed

**Error Handling:**
- If duplicate name: "Office with this name already exists"
- If empty name: "Office name is required"
- If network error: "Failed to create office. Please try again."

---

### Editing an Office

**Actor:** Admin

**Steps:**

1. Navigate to **Office Management**
2. Find the office to edit in the list
3. Tap the **Edit** icon (pencil) next to office name
4. Modify office details:
   - Update office name (must still be unique)
   - Update address
5. Tap **"Save"**
6. Verify success message appears
7. Verify changes reflected in office list
8. Verify changes reflected in office dropdown

**Important Notes:**
- Editing office name does not affect existing transactions (they use office ID)
- Users assigned to this office will see the updated name immediately
- Office ID remains the same

---

### Deleting an Office

**Actor:** Admin

**Steps:**

1. Navigate to **Office Management**
2. Find the office to delete in the list
3. Tap the **Delete** icon (trash) next to office name
4. Read the confirmation dialog carefully
5. If office has transactions or users:
   - Error message appears: "Cannot delete office with associated data"
   - Deletion is blocked
   - See "Preparing Office for Deletion" workflow below
6. If office has no transactions or users:
   - Tap **"Confirm"** in dialog
   - Verify success message appears
   - Verify office removed from list
   - Verify office removed from dropdown

**Important Notes:**
- You cannot delete an office with transactions
- You cannot delete an office with assigned users
- Deleted offices cannot be recovered
- Consider deactivating instead of deleting

---

### Preparing Office for Deletion

**Actor:** Admin

**Prerequisites:**
- Office has transactions or assigned users
- You want to delete the office

**Steps:**

1. **Reassign Users**
   - Navigate to **User Access Management**
   - Find all users assigned to the office
   - For each user, tap Edit
   - Select a different office
   - Tap "Save"

2. **Handle Transactions** (Choose one option)
   
   **Option A: Keep Historical Data**
   - Leave transactions in the office
   - Do not delete the office
   - Mark office as inactive (if feature available)
   
   **Option B: Move Transactions** (Requires database access)
   - Contact database administrator
   - Request transaction migration to another office
   - Wait for confirmation
   - Verify transactions moved

3. **Delete Office**
   - After all users reassigned and transactions handled
   - Navigate to **Office Management**
   - Tap Delete icon
   - Confirm deletion
   - Verify office removed

---

## User Management Workflows

### Creating User with Office Assignment

**Actor:** Admin

**Steps:**

1. Navigate to **User Access Management**
2. Tap **"+ Create User"** button
3. Fill in user details:
   - Full Name
   - Phone Number
   - Username (optional)
   - User Type (Normal / Majur)
   - Role (Admin / Regular)
   - **Office**: Select from dropdown (REQUIRED)
   - Screen Access: Select permissions
4. Tap **"Save"**
5. Verify success message appears
6. Verify new user appears in list with office name displayed
7. Verify format: `[Name] | [Role] | [Office]`

**Validation:**
- Office selection is required
- Cannot create user without office assignment
- Phone number must be unique

**Error Handling:**
- If no office selected: "Please select an office"
- If phone exists: "User with this phone number already exists"

---

### Changing User's Office Assignment

**Actor:** Admin

**Steps:**

1. Navigate to **User Access Management**
2. Find the user whose office needs to be changed
3. Tap the **Edit** icon next to user name
4. In the edit form, tap the **Office** dropdown
5. Select the new office
6. Tap **"Save"**
7. Verify success message appears
8. Verify user list shows updated office name
9. Inform the user about the change

**Important Notes:**
- User's historical transactions remain in old office
- User will only see new office data after change
- User must log out and log back in to see change
- User's old data is not lost, just not visible to them

**Communication Template:**
```
Hi [User Name],

Your office assignment has been changed from [Old Office] to [New Office].

Please log out and log back in to see the change.

Note: Your historical data remains in [Old Office] but you will now work with [New Office] data.

If you have questions, please contact your supervisor.
```

---

## Daily Operations Workflows

### Regular User Daily Workflow

**Actor:** Regular User (Non-Admin)

**Morning Routine:**

1. **Login**
   - Open app
   - Enter credentials
   - App automatically loads assigned office

2. **Verify Office**
   - Check header: `[Your Name] | [Your Role] | [Your Office]`
   - Confirm office name is correct
   - If incorrect, contact admin

3. **View Dashboard**
   - Home screen shows office-specific data
   - Majuri entries for your office
   - Uppad/Jama entries for your office
   - Cash balance for your office

4. **Create Transactions**
   - Navigate to appropriate screen (e.g., Add General Entry)
   - Verify office name displayed on form
   - Fill in transaction details
   - Tap "Save"
   - Transaction automatically tagged with your office

5. **View Reports**
   - Navigate to Daily Report
   - View transactions for your office only
   - Generate PDF if needed
   - PDF includes your office name

**Important Notes:**
- You cannot switch offices
- You cannot see other offices' data
- All your transactions are automatically tagged with your office
- If you need to access another office, contact admin

---

### Admin User Daily Workflow

**Actor:** Admin User

**Morning Routine:**

1. **Login**
   - Open app
   - Enter credentials
   - App loads last selected office

2. **Review All Offices**
   - Tap office dropdown in header
   - Select **"All Offices"**
   - View consolidated dashboard
   - See totals across all offices

3. **Work with Specific Office**
   - Tap office dropdown
   - Select specific office (e.g., "Prem Darvaja Office")
   - View office-specific data
   - Create transactions for that office
   - Transactions tagged with selected office

4. **Switch Between Offices**
   - Tap office dropdown anytime
   - Select different office
   - Data reloads automatically (~2 seconds)
   - Continue working with new office

5. **Generate Reports**
   - For specific office: Select office, then generate report
   - For all offices: Select "All Offices", then generate report
   - PDF includes office information

**Best Practices:**
- Always verify office indicator before creating transactions
- Use "All Offices" view for high-level overview
- Switch to specific office for detailed work
- Double-check office before saving important data

---

### Creating Transaction Workflow

**Actor:** Any User

**Steps:**

1. **Verify Current Office**
   - Look at header
   - Confirm office name is correct
   - If admin and wrong office, switch office first

2. **Navigate to Entry Screen**
   - Example: Add General Entry
   - Example: Agency Payment
   - Example: Driver Transaction

3. **Verify Office on Form**
   - Entry form displays current office name
   - Usually shown at top of form
   - Format: "Office: [Office Name]"

4. **Fill in Transaction Details**
   - Enter all required fields
   - Date, amount, description, etc.
   - Do NOT manually enter office - it's automatic

5. **Save Transaction**
   - Tap "Save" button
   - Transaction automatically tagged with current office
   - Success message appears

6. **Verify Transaction Saved**
   - Navigate to Daily Report or relevant list
   - Find your transaction
   - Verify it appears in the list
   - Verify office name (if displayed)

**Error Handling:**
- If "No office selected" error: Contact admin
- If save fails: Check internet connection, try again
- If transaction doesn't appear: Verify you're viewing correct office

---

## Reporting Workflows

### Generating Daily Report for Specific Office

**Actor:** Admin or Regular User

**Steps:**

1. **Select Office** (Admin only)
   - Tap office dropdown in header
   - Select the office you want to report on
   - Wait for data to reload

2. **Navigate to Daily Report**
   - Tap "Daily Report" from menu
   - Report shows current office data

3. **Select Date**
   - Use date picker to select date
   - Report updates with transactions for that date
   - Only shows transactions from current office

4. **Review Report**
   - Check all transaction categories
   - Verify totals
   - Confirm office name in header

5. **Generate PDF** (Optional)
   - Tap "Generate PDF" or "Export" button
   - PDF includes office name in header
   - PDF shows all transactions for selected date and office
   - Save or share PDF

**Report Sections:**
- Agency Payments
- Agency Majuri
- Driver Transactions
- Fuel Entries
- General Entries
- Cash Records
- Totals (office-specific)

---

### Generating Consolidated Report (All Offices)

**Actor:** Admin Only

**Steps:**

1. **Select "All Offices"**
   - Tap office dropdown in header
   - Select "All Offices" option
   - Wait for data to reload

2. **Navigate to Daily Report**
   - Tap "Daily Report" from menu
   - Report shows consolidated data

3. **Select Date**
   - Use date picker to select date
   - Report updates with transactions from all offices

4. **Review Consolidated Report**
   - Transactions grouped by office
   - Each office section shows its totals
   - Grand total at bottom

5. **Generate PDF**
   - Tap "Generate PDF"
   - PDF includes office-wise breakdown
   - Each office has its own section
   - Grand totals at end

**Report Structure:**
```
Daily Report - All Offices
Date: [Selected Date]

=== Prem Darvaja Office ===
Agency Payments: ₹X,XXX
Agency Majuri: ₹X,XXX
...
Office Total: ₹XX,XXX

=== Aslali Office ===
Agency Payments: ₹X,XXX
Agency Majuri: ₹X,XXX
...
Office Total: ₹XX,XXX

=== Grand Total ===
Total: ₹XXX,XXX
```

---

### Generating Monthly Statement

**Actor:** Admin or Regular User

**Steps:**

1. **Select Office** (Admin only)
   - For specific office: Select office from dropdown
   - For all offices: Select "All Offices"

2. **Navigate to Monthly Statement**
   - Tap "Monthly Statement" from menu

3. **Select Month and Year**
   - Use month picker
   - Use year picker
   - Report updates automatically

4. **Review Monthly Data**
   - View monthly totals by category
   - View daily breakdown
   - View trends and comparisons

5. **Generate PDF** (Optional)
   - Tap "Generate PDF"
   - PDF includes office information
   - PDF shows monthly summary and daily breakdown

**Consolidated Monthly Statement (Admin):**
- Shows data from all offices
- Office-wise breakdown
- Comparative analysis
- Performance metrics per office

---

## Troubleshooting Workflows

### User Cannot See Any Data

**Problem:** User logs in but sees no transactions or data

**Troubleshooting Steps:**

1. **Verify Office Assignment**
   - Admin: Check User Access Management
   - Verify user has office assigned
   - If no office: Assign office to user

2. **Verify Office Has Data**
   - Admin: Switch to user's office
   - Check if office has any transactions
   - If no data: Office might be new or empty

3. **Verify Screen Access**
   - Admin: Check user's screen access permissions
   - Verify user has permission to view screens
   - If no access: Grant appropriate permissions

4. **Verify Network Connection**
   - Check internet connectivity
   - Try refreshing the screen
   - Try logging out and back in

---

### Admin Cannot Switch Offices

**Problem:** Office dropdown not appearing or not working

**Troubleshooting Steps:**

1. **Verify Admin Status**
   - Check user profile in database
   - Verify `is_admin = true`
   - If not admin: Grant admin permissions

2. **Verify Multiple Offices Exist**
   - Navigate to Office Management
   - Verify at least 2 offices exist
   - If only 1 office: Create additional office

3. **Clear App Cache**
   - Log out
   - Clear app data (if possible)
   - Log back in
   - Try switching again

4. **Check for Errors**
   - Look for error messages
   - Check console logs
   - Contact technical support

---

### Transactions Appearing in Wrong Office

**Problem:** Transaction created in Office A appears in Office B

**Troubleshooting Steps:**

1. **Verify Office at Time of Creation**
   - Check which office was selected when transaction was created
   - Transaction is tagged with office at creation time

2. **Check Transaction Details**
   - Admin: View transaction in database
   - Check `office_id` field
   - Verify it matches expected office

3. **Verify No Manual Editing**
   - Ensure no one manually edited office_id
   - Check audit logs if available

4. **Contact Support**
   - If issue persists, contact technical support
   - Provide transaction ID and details
   - May require database correction

---

## Best Practices Summary

### For Admins

1. **Always verify office indicator before creating transactions**
2. **Use "All Offices" view for overview, specific office for detailed work**
3. **Assign users to correct office during creation**
4. **Review office assignments regularly**
5. **Don't delete offices with historical data**
6. **Communicate office changes to affected users**
7. **Generate consolidated reports for management**

### For Regular Users

1. **Check office indicator on every screen**
2. **Report any discrepancies immediately**
3. **Don't try to access other offices' data**
4. **Contact admin if office assignment needs to change**
5. **Verify office name on entry forms before saving**

### For Everyone

1. **Double-check office before saving important transactions**
2. **Use consistent naming for offices**
3. **Keep office addresses updated**
4. **Report bugs or issues immediately**
5. **Follow established workflows**

---

**Last Updated**: February 2026  
**Version**: 1.0
