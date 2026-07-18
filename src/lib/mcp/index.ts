import { auth, defineMcp } from "@lovable.dev/mcp-js";

// Auth
import whoamiTool from "./tools/whoami";
import currentPermissionsTool from "./tools/current-permissions";
import currentOrganizationsTool from "./tools/current-organizations";

// Users
import listUsersTool from "./tools/list-users";
import getUserTool from "./tools/get-user";
import createUserTool from "./tools/create-user";
import updateUserTool from "./tools/update-user";
import deactivateUserTool from "./tools/deactivate-user";
import assignRoleTool from "./tools/assign-role";
import revokeRoleTool from "./tools/revoke-role";
import delegatePermissionTool from "./tools/delegate-permission";

// Organizations
import listOrganizationsTool from "./tools/list-organizations";
import createOrganizationTool from "./tools/create-organization";
import updateOrganizationTool from "./tools/update-organization";
import inviteMemberTool from "./tools/invite-member";
import removeMemberTool from "./tools/remove-member";

// Events
import listEventsTool from "./tools/list-events";
import getEventTool from "./tools/get-event";
import createEventTool from "./tools/create-event";
import createEventDraftTool from "./tools/create-event-draft";
import updateEventTool from "./tools/update-event";
import duplicateEventTool from "./tools/duplicate-event";
import publishEventTool from "./tools/publish-event";
import archiveEventTool from "./tools/archive-event";
import cancelEventTool from "./tools/cancel-event";
import deleteEventTool from "./tools/delete-event";
import changeEventStatusTool from "./tools/change-event-status";

// Registrations
import registerEventTool from "./tools/register-event";
import unregisterEventTool from "./tools/unregister-event";
import listRegistrationsTool from "./tools/list-registrations";
import listMyRegistrationsTool from "./tools/list-my-registrations";
import approveRegistrationTool from "./tools/approve-registration";
import rejectRegistrationTool from "./tools/reject-registration";

// Teams
import createTeamTool from "./tools/create-team";
import joinTeamTool from "./tools/join-team";
import inviteTeamMemberTool from "./tools/invite-team-member";
import removeTeamMemberTool from "./tools/remove-team-member";
import transferLeaderTool from "./tools/transfer-leader";

// Attendance
import generateQrTool from "./tools/generate-qr";
import validateQrTool from "./tools/validate-qr";
import scanQrTool from "./tools/scan-qr";
import manualCheckinTool from "./tools/manual-checkin";
import checkoutTool from "./tools/checkout";
import attendanceReportTool from "./tools/attendance-report";

// Analytics
import eventStatisticsTool from "./tools/event-statistics";
import attendanceStatisticsTool from "./tools/attendance-statistics";
import registrationStatisticsTool from "./tools/registration-statistics";
import dashboardMetricsTool from "./tools/dashboard-metrics";

// Search
import globalSearchTool from "./tools/global-search";

// Audit
import auditLogsTool from "./tools/audit-logs";
import permissionHistoryTool from "./tools/permission-history";
import eventHistoryTool from "./tools/event-history";

// Media (Phase 4)
import uploadImageTool from "./tools/upload-image";
import uploadVideoTool from "./tools/upload-video";
import uploadDocumentTool from "./tools/upload-document";
import deleteMediaTool from "./tools/delete-media";
import listMediaTool from "./tools/list-media";

// Import/Export (Phase 6)
import exportCsvTool from "./tools/export-csv";
import exportExcelTool from "./tools/export-excel";
import exportPdfTool from "./tools/export-pdf";

// Certificates (Phase 7)
import generateCertificateTool from "./tools/generate-certificate";
import verifyCertificateTool from "./tools/verify-certificate";
import downloadCertificateTool from "./tools/download-certificate";

// Notifications (Phase 7)
import sendNotificationTool from "./tools/send-notification";
import scheduleNotificationTool from "./tools/schedule-notification";
import notificationHistoryTool from "./tools/notification-history";


// The OAuth issuer MUST be the direct Supabase host — the .lovable.cloud proxy
// publishes the direct supabase.co issuer in its discovery document and mcp-js
// rejects mismatches (RFC 8414). VITE_SUPABASE_PROJECT_ID is inlined by Vite
// at build time; the fallback keeps the URL well-formed during the throwaway
// manifest-extract eval — no real token will ever verify against the sentinel.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "utsav-mcp",
  title: "Utsav",
  version: "1.0.0",
  instructions:
    "Utsav is an enterprise event management platform. These tools are the official AI integration layer for reading and modifying events, registrations, teams, attendance, organizations, roles, and audit data for the signed-in user. Every call authenticates via Supabase OAuth, authorizes through Utsav's RBAC (student/volunteer/organizer/coordinator/judge/faculty/admin), and is enforced by row-level security. Errors follow a structured {error:{code,message}} envelope.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    // Auth
    whoamiTool, currentPermissionsTool, currentOrganizationsTool,
    // Users
    listUsersTool, getUserTool, createUserTool, updateUserTool, deactivateUserTool,
    assignRoleTool, revokeRoleTool, delegatePermissionTool,
    // Organizations
    listOrganizationsTool, createOrganizationTool, updateOrganizationTool,
    inviteMemberTool, removeMemberTool,
    // Events
    listEventsTool, getEventTool, createEventTool, createEventDraftTool,
    updateEventTool, duplicateEventTool, publishEventTool, archiveEventTool,
    cancelEventTool, deleteEventTool, changeEventStatusTool,
    // Registrations
    registerEventTool, unregisterEventTool, listRegistrationsTool, listMyRegistrationsTool,
    approveRegistrationTool, rejectRegistrationTool,
    // Teams
    createTeamTool, joinTeamTool, inviteTeamMemberTool, removeTeamMemberTool, transferLeaderTool,
    // Attendance
    generateQrTool, validateQrTool, scanQrTool, manualCheckinTool, checkoutTool, attendanceReportTool,
    // Analytics
    eventStatisticsTool, attendanceStatisticsTool, registrationStatisticsTool, dashboardMetricsTool,
    // Search
    globalSearchTool,
    // Audit
    auditLogsTool, permissionHistoryTool, eventHistoryTool,
    // Roadmap (structured NOT_IMPLEMENTED)
    uploadImage, uploadVideo, uploadDocument, deleteMedia, listMedia,
    exportExcel, exportCsv, exportPdf,
    generateCertificate, verifyCertificate, downloadCertificate,
    sendNotification, scheduleNotification, notificationHistory,
  ],
});
