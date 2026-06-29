import type { Issue } from "./types.js";

export const ISSUES: Record<string, Issue> = {
  A1: {
    code: "A1",
    category: "Login & Account",
    title: "User not found during signup",
    solution: "Your user account has not been created in the system yet.\n\n**Solution:** Please share the following details with our team on this chat so we can register you:\n- Full name\n- Contact number\n- Designation\n- Company name\n\nOur team will register you and confirm within 1 working day.",
  },
  A2: {
    code: "A2",
    category: "Login & Account",
    title: "Unable to login",
    solution: "Wrong credentials or inactive account.\n\n**Solution:**\n1. Tap **Forgot Password** on the login screen and reset your credentials using your registered email or mobile number.\n2. If the problem persists, contact your site administrator to reactivate your account.",
  },
  B1: {
    code: "B1",
    category: "Location, GPS & Geofence",
    title: "Out of geofence message",
    solution: "Low GPS accuracy.\n\n**Solution:**\n1. Open the app and check your current location on the map.\n2. Move to an open area (away from high-rise buildings or rooftops).\n3. Wait 30 seconds and retry.",
  },
  B2: {
    code: "B2",
    category: "Location, GPS & Geofence",
    title: "Site or geofence not visible",
    solution: "Your site assignment is pending after signup.\n\n**Solution:** Please share the following details in this chat:\n- Full name\n- Contact number\n- Designation\n- Company name\n\nOur team will assign your site and notify you.",
  },
  B3: {
    code: "B3",
    category: "Location, GPS & Geofence",
    title: "Geofence missing from map",
    solution: "Geofence not yet created or deleted from system.\n\n**Solution:** Please do one of the following:\n- Share your current live location on this chat, OR\n- Share the KML file of the site boundary\n\nOur team will create the geofence for you.",
  },
  B4: {
    code: "B4",
    category: "Location, GPS & Geofence",
    title: "Location not fetching",
    solution: "Location permission denied or GPS disabled.\n\n**Solution:**\n1. Go to phone **Settings** > **Apps** > **PugArch FSM** > **Permissions**.\n2. Set **Location** to **Always Allow**.\n3. Make sure GPS is turned **ON**.\n4. Turn mobile data or WiFi on.\n5. Close and reopen the app.",
  },
  C1: {
    code: "C1",
    category: "Attendance & Tracking",
    title: "Face recognition failed",
    solution: "Camera permission is denied or facial data missing.\n\n**Solution:**\n1. Go to phone **Settings** > **Apps** > **PugArch FSM** > **Permissions**.\n2. Allow **Camera** permission.\n3. Retry face recognition.\n\nIf it still fails, please share a clear selfie with your full name and details on this chat. Our team will update your face data.",
  },
  C2: {
    code: "C2",
    category: "Attendance & Tracking",
    title: "Attendance not syncing",
    solution: "Server or network issue.\n\n**Solution:**\n1. Check your internet connection (mobile data or WiFi).\n2. Open the app and go to the **Attendance** section.\n3. Tap the **Upload** button to manually sync offline attendance.",
  },
  C3: {
    code: "C3",
    category: "Attendance & Tracking",
    title: "Live tracking not updating",
    solution: "Location permission not set to Always Allow.\n\n**Solution:**\n1. Go to phone **Settings** > **Apps** > **PugArch FSM** > **Permissions**.\n2. Set Location to **Always Allow** (not just *While Using*).\n3. Restart the app.",
  },
  C4: {
    code: "C4",
    category: "Attendance & Tracking",
    title: "Tracking showing wrong route",
    solution: "Location permission denied or app not updated.\n\n**Solution:**\n1. Set Location permission to **Always Allow**.\n2. Check if a newer app update is available in the Play Store and install it.\n3. Restart the app.",
  },
  C5: {
    code: "C5",
    category: "Attendance & Tracking",
    title: "Patrolling status not updating",
    solution: "Old app version or location permission denied.\n\n**Solution:**\n1. Set Location permission to **Always Allow**.\n2. Update the app to the latest version from the Play Store.\n3. Restart and retry.",
  },
  D1: {
    code: "D1",
    category: "App Crashes & Performance",
    title: "Application crashing frequently",
    solution: "Old app version or device compatibility issue.\n\n**Solution:**\n1. Open the Play Store and search **PugArch FSM**.\n2. Tap **Update** if available.\n3. If it is still crashing, uninstall and reinstall the app.",
  },
  D2: {
    code: "D2",
    category: "App Crashes & Performance",
    title: "Slow app performance",
    solution: "Low device RAM or too many background apps.\n\n**Solution:**\n1. Close all unused apps running in the background.\n2. Restart your phone.\n3. Reopen **PugArch FSM**.",
  },
  D3: {
    code: "D3",
    category: "App Crashes & Performance",
    title: "App not installing",
    solution: "Unsupported Android version or low storage space.\n\n**Solution:**\n1. Check your Android version — **PugArch FSM** requires Android 8.0 or above.\n2. Free up storage space (at least 200 MB recommended).\n3. Retry installation from the Play Store.",
  },
  E1: {
    code: "E1",
    category: "Data & Sync",
    title: "Data loss after logout",
    solution: "Offline data was not synced before logout.\n\n**Solution:**\n1. Before logging out, always tap the **Sync / Upload** button to push all offline data to the server.\n2. Wait for the sync confirmation message before tapping Logout.\n\n*Tip:* Always ensure you have an active internet connection before logging out.",
  },
};
