# Setup Production Email Notifications

## Current Status

- ✅ Email notification system is working
- ✅ Resend API is configured
- ⚠️ Currently limited to test mode (only `hello@arnau.design`)

## To Enable Production Emails

### 1. Verify Your Domain in Resend

1. **Go to Resend Dashboard**

   - Visit: https://resend.com/domains
   - Login with your Resend account

2. **Add Your Domain**

   - Click "Add Domain"
   - Enter: `arnau.design`
   - Click "Add"

3. **Configure DNS Records**
   Resend will provide DNS records to add to your domain. You'll need to add these to your domain's DNS settings:

   **SPF Record:**

   ```
   Type: TXT
   Name: @
   Value: v=spf1 include:_spf.resend.com ~all
   ```

   **DKIM Record:**

   ```
   Type: CNAME
   Name: resend._domainkey
   Value: [provided by Resend]
   ```

   **MX Record:**

   ```
   Type: MX
   Name: @
   Value: feedback.resend.com
   Priority: 10
   ```

4. **Add DNS Records**

   - Go to your domain registrar (where you bought `arnau.design`)
   - Find DNS management section
   - Add the records provided by Resend
   - Wait for DNS propagation (5-15 minutes)

5. **Verify Domain**
   - Return to Resend dashboard
   - Click "Verify DNS Records"
   - Wait for verification to complete

### 2. Update Environment Variables

The following are already configured in `.env.local`:

```bash
EMAIL_FROM=contracts@arnau.design
NEXT_PUBLIC_EMAIL_FROM=contracts@arnau.design
```

### 3. Test Production Emails

After domain verification, test with any email address:

```bash
# Test with any email
curl -X POST http://localhost:3000/api/sendNotification \
  -H "Content-Type: application/json" \
  -d '{
    "to": "any-email@example.com",
    "recipientName": "Test User",
    "signerName": "John Designer",
    "contractId": "test-contract-123",
    "contractTitle": "Test Contract",
    "notificationType": "designer_signed"
  }'
```

### 4. Update Test Page

Once verified, update the test page to use any email address:

```typescript
const testData = {
  to: "any-email@example.com", // Can now use any email
  recipientName: "Test User",
  signerName: "John Designer",
  contractId: "test-contract-123",
  contractTitle: "Test Contract",
};
```

## Current Email Flow

1. **Designer signs** → Client gets email at `recipientEmail`
2. **Client signs** → Designer gets email at `designerEmail` (or current user's email)
3. **Both complete** → Both parties get completion emails

## Production Ready Features

- ✅ Email templates for all notification types
- ✅ Fallback to Firebase Functions if Resend fails
- ✅ Error handling and logging
- ✅ Rate limiting protection
- ✅ HTML and text versions of emails

## Troubleshooting

### If emails don't send:

1. Check Resend dashboard for domain status
2. Verify DNS records are correct
3. Check email deliverability in Resend logs
4. Ensure `EMAIL_FROM` matches your verified domain

### If emails go to spam:

1. Add SPF, DKIM, and DMARC records
2. Use a professional from address
3. Monitor email reputation
4. Consider using a dedicated IP

## Next Steps

1. **Verify domain** in Resend dashboard
2. **Add DNS records** to your domain
3. **Test with any email address**
4. **Monitor deliverability** in Resend logs
5. **Update production environment** with verified domain

Once domain verification is complete, your email notification system will work with any email address!
