# HubSpot Form -> Course Access

Use a HubSpot workflow webhook to grant one published course to anyone who submits a specific form.

## What this flow does

1. Contact submits a HubSpot form.
2. HubSpot workflow sends a webhook to the app.
3. The app creates the user if needed.
4. The app creates portal membership if needed.
5. The app enrolls that user in exactly one course.
6. New users receive the Supabase setup email to create their password.

Existing users are enrolled without a new password email because they already have an account.

## App endpoint

Use the portal host for the webhook URL so invite/setup emails stay on the correct domain:

```text
https://superabound.coursesforcreatives.com/api/hubspot/form-enrollment
```

## Required environment variables

Set at least one webhook verification method:

- `HUBSPOT_WEBHOOK_SECRET`
- `HUBSPOT_WEBHOOK_CLIENT_SECRET`

Optional:

- `HUBSPOT_DEFAULT_COURSE_SLUG`

`HUBSPOT_DEFAULT_COURSE_SLUG` lets the webhook omit `courseSlug` if this form should always grant the same course.

## Recommended HubSpot setup

### Trigger

Create a HubSpot workflow that enrolls contacts when they submit the chosen form.

### Action

Add a `Send a webhook` action.

Method:

```text
POST
```

URL:

```text
https://superabound.coursesforcreatives.com/api/hubspot/form-enrollment
```

Header if using shared-secret auth:

```text
Authorization: Bearer YOUR_HUBSPOT_WEBHOOK_SECRET
```

JSON body:

```json
{
  "email": "{{ contact.email }}",
  "firstName": "{{ contact.firstname }}",
  "lastName": "{{ contact.lastname }}",
  "courseSlug": "your-public-course-slug"
}
```

If this workflow always grants the same course, you can set `HUBSPOT_DEFAULT_COURSE_SLUG` in the app and use:

```json
{
  "email": "{{ contact.email }}",
  "firstName": "{{ contact.firstname }}",
  "lastName": "{{ contact.lastname }}"
}
```

## Course requirements

The target course must:

- exist in the current portal
- have the correct `slug`
- be `published`

## Webhook response

Success response example:

```json
{
  "ok": true,
  "action": "invited_new_user",
  "portalSlug": "superabound",
  "courseSlug": "your-public-course-slug",
  "redirectTo": "https://superabound.coursesforcreatives.com/auth/callback?next=%2Fcreate-account%3Fmessage%3DCreate%2Byour%2Bpassword%2Bto%2Bfinish%2Bsetting%2Bup%2Byour%2Baccount.",
  "email": "person@example.com"
}
```

Existing user response:

```json
{
  "ok": true,
  "action": "enrolled_existing_user",
  "portalSlug": "superabound",
  "courseSlug": "your-public-course-slug",
  "redirectTo": "https://superabound.coursesforcreatives.com/auth/callback?next=%2Fcreate-account%3Fmessage%3DCreate%2Byour%2Bpassword%2Bto%2Bfinish%2Bsetting%2Bup%2Byour%2Baccount.",
  "email": "person@example.com"
}
```

## Operational notes

- This route is idempotent for membership and enrollment creation.
- Repeated form submissions will not create duplicate enrollments.
- New-user welcome emails depend on the existing Supabase invite email configuration.
- If you want existing users to also receive a setup/reset email on submission, that can be added as a follow-up behavior.
