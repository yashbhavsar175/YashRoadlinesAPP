# Office Management Screen - User Guide

## Accessing the Screen

**For Administrators:**
1. Open the app and log in with admin credentials
2. Navigate to **Admin Panel**
3. Scroll to the **Masters** section
4. Tap on **Office Management**

## Features Overview

### 1. View All Offices
- See a list of all offices in the system
- Each office card shows:
  - Office name with business icon
  - Office address (if provided)
  - Creation date
  - Edit and Delete buttons

### 2. Search Offices
- Use the search bar at the top to filter offices
- Search works on both office name and address
- Results update in real-time as you type

### 3. Create New Office

**Steps:**
1. Tap the green **"Create New Office"** button
2. Enter the office name (required)
3. Optionally enter the office address
4. Tap **"Create Office"**

**Validation:**
- Office name must be unique (case-insensitive)
- Whitespace is automatically trimmed
- If a duplicate name is detected, you'll see an error message

**Example:**
```
Office Name: Aslali Office
Office Address: Plot 123, Aslali Industrial Area, Ahmedabad
```

### 4. Edit Office Details

**Steps:**
1. Find the office you want to edit
2. Tap the **"Edit"** button on the office card
3. Modify the name and/or address
4. Tap **"Update Office"**

**Notes:**
- You can change the name to a new unique name
- You cannot change the name to match another existing office
- Address can be added, modified, or removed

### 5. Delete Office

**Steps:**
1. Find the office you want to delete
2. Tap the **"Delete"** button on the office card
3. Read the confirmation message carefully
4. Tap **"Delete"** to confirm or **"Cancel"** to abort

**Important Restrictions:**
An office can only be deleted if:
- ✅ It has NO associated transactions in any table
- ✅ It has NO users assigned to it

If deletion fails, you'll see a message explaining:
- Which transactions exist for this office, OR
- That users are still assigned to this office

**Before Deleting:**
1. Reassign all users to a different office
2. Ensure no transactions exist for this office
3. Consider if you really need to delete (offices can be kept for historical records)

## Statistics Display

At the top of the screen, you'll see:
- **Total Offices:** Total number of offices in the system
- **Filtered Results:** Number of offices matching your search

## Tips and Best Practices

### Naming Conventions
- Use descriptive names: "Prem Darvaja Office" instead of "Office 1"
- Include location information in the name if helpful
- Keep names concise but clear

### Address Information
- Include full address for clarity
- Add landmarks if helpful
- Include city and state for multi-city operations

### Office Management Strategy
1. **Create offices first** before assigning users
2. **Assign users** to offices via User Access Management
3. **Monitor usage** - keep offices that have historical data
4. **Archive instead of delete** - consider keeping offices even if not currently active

### Data Integrity
- The system prevents accidental deletion of offices with data
- Always check which users are assigned before attempting deletion
- Review transaction history before deletion attempts

## Common Scenarios

### Scenario 1: Opening a New Branch
1. Create new office with branch name and address
2. Go to User Access Management
3. Assign users to the new office
4. Users can now create transactions for that office

### Scenario 2: Closing a Branch
1. Reassign all users to other offices
2. Ensure all pending transactions are completed
3. Keep the office for historical records (recommended)
4. OR delete the office if no transactions exist

### Scenario 3: Correcting Office Information
1. Use Edit function to update name or address
2. Changes reflect immediately across the app
3. All existing transactions remain associated with the office

### Scenario 4: Duplicate Office Name Error
If you see "An office with this name may already exist":
1. Check the office list for similar names
2. Choose a more specific name
3. Add location details to differentiate (e.g., "Aslali Office - North")

## Troubleshooting

### "Failed to create office"
**Possible causes:**
- Office name already exists (check for similar names)
- Network connection issue
- Database error

**Solutions:**
- Try a different office name
- Check your internet connection
- Contact system administrator if problem persists

### "Cannot delete office"
**Possible causes:**
- Office has associated transactions
- Users are assigned to this office

**Solutions:**
- Reassign users to different offices first
- Check transaction history for this office
- Consider keeping the office instead of deleting

### Office not appearing in dropdown
**Solution:**
- The office list refreshes automatically
- If not visible, try logging out and back in
- Contact administrator if issue persists

## Integration with Other Features

### User Assignment
- After creating an office, assign users via **User Access Management**
- Users will only see data for their assigned office
- Admins can switch between offices using the header dropdown

### Transaction Filtering
- All transactions are automatically filtered by office
- When you switch offices, transaction lists update automatically
- Reports show data only for the selected office

### Office Switching (Admin Only)
- Admins see an office dropdown in the header
- Select an office to view its data
- Create transactions for the selected office

## Security and Permissions

### Who Can Access?
- Only administrators can access Office Management
- Regular users cannot create, edit, or delete offices
- Regular users are assigned to one office and cannot switch

### Data Protection
- Office deletion is protected by transaction checks
- User assignment checks prevent accidental data loss
- All operations are logged for audit purposes

## Support

If you encounter issues or need assistance:
1. Check this guide for common solutions
2. Verify you have admin permissions
3. Contact your system administrator
4. Provide error messages and screenshots if available

---

**Last Updated:** 2026-02-08
**Version:** 1.0
