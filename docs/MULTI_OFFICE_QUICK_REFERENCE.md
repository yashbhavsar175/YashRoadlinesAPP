# Multi-Office Support - Quick Reference Guide

## Quick Links

- **User Guide**: [Multi-Office User Guide](MULTI_OFFICE_USER_GUIDE.md)
- **Admin Guide**: [Multi-Office Admin Guide](MULTI_OFFICE_ADMIN_GUIDE.md)
- **Workflows**: [Multi-Office Workflows](MULTI_OFFICE_WORKFLOWS.md)
- **Database Schema**: [Database Schema Documentation](MULTI_OFFICE_DATABASE_SCHEMA.md)
- **Code Reference**: [Code Reference](MULTI_OFFICE_CODE_REFERENCE.md)

---

## At a Glance

### What is Multi-Office Support?

Manage multiple office locations (e.g., "Prem Darvaja Office", "Aslali Office") in one app with complete data segregation.

### Key Features

✅ Create and manage multiple offices  
✅ Assign users to specific offices  
✅ Automatic office tagging for all transactions  
✅ Office switching for admins  
✅ Consolidated reports across all offices  
✅ Complete data isolation between offices  

---

## For Regular Users

### Where is My Office Displayed?

**Header on every screen:**
```
[Your Name] | [Your Role] | [Your Office]
```

### Can I Switch Offices?

❌ **No** - Only admins can switch offices  
✅ You see only your assigned office data

### How Are My Transactions Tagged?

🔄 **Automatically** - All transactions are tagged with your office  
✅ No manual action required

### What If I Need to Change Offices?

📞 **Contact your admin** - They can reassign you

---

## For Admin Users

### How Do I Switch Offices?

1. Tap office dropdown in header: `[Name | Role | Office ▼]`
2. Select office from list
3. Data reloads automatically (~2 seconds)

### How Do I View All Offices?

1. Tap office dropdown
2. Select **"All Offices"**
3. View consolidated data

### How Do I Create a New Office?

1. Navigate to **Office Management**
2. Tap **"+ Create Office"**
3. Enter name and address
4. Tap **"Save"**

### How Do I Assign Users to Offices?

**During User Creation:**
1. Navigate to **User Access Management**
2. Tap **"+ Create User"**
3. Select office from dropdown
4. Complete form and save

**Change Existing User:**
1. Find user in list
2. Tap **Edit** icon
3. Select new office
4. Tap **"Save"**

---

## Common Tasks

### Create Transaction

1. ✅ Verify office indicator in header
2. 📝 Navigate to entry screen
3. ✅ Verify office name on form
4. 📝 Fill in details
5. 💾 Tap "Save"
6. ✅ Transaction automatically tagged

### Generate Daily Report

**Specific Office:**
1. Select office from dropdown (admin only)
2. Navigate to Daily Report
3. Select date
4. Generate PDF (optional)

**All Offices (Admin):**
1. Select "All Offices" from dropdown
2. Navigate to Daily Report
3. Select date
4. Generate PDF with office breakdown

### Generate Monthly Statement

1. Select office (or "All Offices" for admin)
2. Navigate to Monthly Statement
3. Select month and year
4. Generate PDF (optional)

---

## Keyboard Shortcuts & Tips

### Quick Office Verification

👀 **Always check header** before creating transactions

### Office Switching (Admin)

🔄 **Tap dropdown** → Select office → Wait 2 seconds

### Data Reload

🔄 **Automatic** - No manual refresh needed after office switch

---

## Troubleshooting

### No Data Visible

**Check:**
- ✅ Office assignment (admin: User Access Management)
- ✅ Office has transactions
- ✅ Screen access permissions
- ✅ Internet connection

**Fix:**
- Assign office to user
- Create test transaction
- Grant screen access
- Check network

### Cannot Switch Offices

**Check:**
- ✅ User is admin (`is_admin = true`)
- ✅ Multiple offices exist
- ✅ Office dropdown visible in header

**Fix:**
- Grant admin permissions
- Create additional office
- Log out and back in

### Wrong Office Displayed

**Check:**
- ✅ Office assignment in User Access Management
- ✅ Last selected office (admin)

**Fix:**
- Admin: Reassign user to correct office
- Admin: Switch to correct office
- Log out and back in

### Transaction in Wrong Office

**Cause:**
- Transaction tagged with office at creation time
- Wrong office was selected when created

**Fix:**
- Verify office before creating transactions
- Contact admin for database correction if needed

---

## Database Quick Reference

### Tables

- `offices` - Office information
- `user_profiles` - User office assignments
- All transaction tables - Include `office_id` column

### Key Columns

- `office_id` - Foreign key to offices table
- `office_name` - Denormalized for display

### Indexes

All transaction tables have index on `office_id` for performance

---

## API Quick Reference

### Context

```typescript
import { useOffice } from '../context/OfficeContext';

const { 
  currentOffice,        // Current office object
  availableOffices,     // Array of all offices
  canSwitchOffice,      // true for admin
  switchOffice,         // Function to switch office
  getCurrentOfficeId    // Get current office ID
} = useOffice();
```

### Storage Functions

```typescript
// Office Management
getOffices()                              // Get all offices
getOfficeById(id)                         // Get specific office
createOffice(name, address)               // Create new office
updateOffice(id, updates)                 // Update office
deleteOffice(id)                          // Delete office

// User Assignment
getUserOfficeAssignment(userId)           // Get user's office
setUserOfficeAssignment(userId, officeId) // Assign user to office

// Queries (all accept optional officeId)
getAgencyPayments(officeId)               // Get payments
getDriverTransactions(officeId)           // Get transactions
getAllTransactionsForDate(date, officeId) // Get all for date
```

---

## Migration Quick Reference

### Applied Migrations

- **009**: Add multi-office support (tables, columns, indexes)
- **010**: Add RLS policies for office-based access
- **011**: Migrate existing data to default office
- **012**: Add office_id to daily_cash_adjustments
- **013**: Optimize indexes for performance

### Default Office

**Name**: "Prem Darvaja Office"  
**Purpose**: All existing data migrated to this office

---

## Performance Tips

### For Users

- ✅ Office switching takes ~2 seconds
- ✅ Data is cached for 5 minutes
- ✅ All queries use database indexes

### For Developers

- ✅ Use `getCurrentOfficeId()` for all queries
- ✅ Pass `officeId` to all query functions
- ✅ Reload data when office changes
- ✅ Cache office list in context

---

## Security Notes

### Data Isolation

- ✅ RLS policies enforce office-based access
- ✅ Users can only see their office data
- ✅ Admins can see all offices
- ✅ All policies enforced at database level

### Best Practices

- ✅ Never disable RLS on production
- ✅ Always validate office_id before saving
- ✅ Log unauthorized access attempts
- ✅ Review permissions regularly

---

## Support Contacts

### For Users

- **Office Assignment Issues**: Contact your admin
- **Data Discrepancies**: Report to supervisor immediately
- **Technical Issues**: Contact IT support

### For Admins

- **Office Management**: Refer to Admin Guide
- **User Assignment**: Refer to Workflows document
- **Technical Issues**: Contact development team

### For Developers

- **Code Questions**: Refer to Code Reference
- **Database Issues**: Refer to Database Schema
- **Integration**: Refer to Workflows document

---

## Version Information

**Feature Version**: 1.0  
**Last Updated**: February 2026  
**Database Version**: PostgreSQL 14+ (Supabase)  
**App Version**: Compatible with all versions after multi-office implementation

---

## Glossary

| Term | Definition |
|------|------------|
| **Office** | Physical business location (e.g., "Prem Darvaja Office") |
| **Office Context** | Currently selected office determining which data is displayed |
| **Office Switching** | Admin ability to change active office |
| **Office Assignment** | User's designated office location |
| **Consolidated View** | "All Offices" view showing aggregated data |
| **Data Segregation** | Isolation of data by office location |
| **RLS** | Row Level Security - Database-level access control |
| **Office Indicator** | Header display showing current office |

---

## Quick Checklist

### Before Creating Transaction

- [ ] Check office indicator in header
- [ ] Verify correct office selected (admin)
- [ ] Confirm office name on entry form
- [ ] Fill in transaction details
- [ ] Save transaction

### Before Generating Report

- [ ] Select correct office (or "All Offices")
- [ ] Navigate to report screen
- [ ] Select date/month
- [ ] Review data
- [ ] Generate PDF if needed

### Before Deleting Office

- [ ] Reassign all users to other offices
- [ ] Verify no transactions exist (or decide to keep them)
- [ ] Confirm deletion is necessary
- [ ] Delete office
- [ ] Verify removal from system

---

**Need More Details?**

Refer to the comprehensive guides:
- [User Guide](MULTI_OFFICE_USER_GUIDE.md) - For regular users
- [Admin Guide](MULTI_OFFICE_ADMIN_GUIDE.md) - For administrators
- [Workflows](MULTI_OFFICE_WORKFLOWS.md) - Detailed step-by-step workflows
- [Code Reference](MULTI_OFFICE_CODE_REFERENCE.md) - For developers
- [Database Schema](MULTI_OFFICE_DATABASE_SCHEMA.md) - Database details
