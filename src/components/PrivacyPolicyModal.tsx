import React, { useState } from "react";
import {
  X,
  Shield,
  FileText,
  Printer,
  ChevronLeft,
  ChevronRight,
  Info,
  Lock,
  Eye,
  Database,
  Mail,
  Phone,
  MapPin,
  CheckCircle2
} from "lucide-react";

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAcknowledge?: () => void;
}

export default function PrivacyPolicyModal({
  isOpen,
  onClose,
  onAcknowledge,
}: PrivacyPolicyModalProps) {
  const [activeTab, setActiveTab] = useState<"continuous" | "paginated">("continuous");
  const [currentPage, setCurrentPage] = useState<number>(1);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-white text-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-200">
        
        {/* MODAL HEADER */}
        <div className="bg-[#1e293b] text-white px-5 py-4 flex items-center justify-between shrink-0 shadow-md border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-400/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-mono tracking-widest text-slate-300 font-bold">HemoLink Data Privacy</span>
                <span className="bg-blue-500/30 text-blue-200 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">7 Pages • Official</span>
              </div>
              <h2 className="text-lg font-bold tracking-tight text-white leading-tight flex items-center gap-2">
                Privacy Policy
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              title="Print Policy Document"
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTROLS BAR: VIEW MODE SWITCHER & PAGINATION */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium text-[11px]">View Mode:</span>
            <div className="bg-slate-200 p-0.5 rounded-lg flex items-center font-bold text-[11px]">
              <button
                onClick={() => setActiveTab("continuous")}
                className={`px-3 py-1 rounded-md transition ${
                  activeTab === "continuous"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Continuous Document
              </button>
              <button
                onClick={() => setActiveTab("paginated")}
                className={`px-3 py-1 rounded-md transition ${
                  activeTab === "paginated"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                PDF Pages (1-7)
              </button>
            </div>
          </div>

          {activeTab === "paginated" && (
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono font-bold text-slate-700 text-xs px-2">
                Page {currentPage} of 7
              </span>
              <button
                disabled={currentPage >= 7}
                onClick={() => setCurrentPage((p) => Math.min(7, p + 1))}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
            <Lock className="w-3.5 h-3.5 text-blue-600" />
            <span>Encrypted & Confidential User Protection</span>
          </div>
        </div>

        {/* DOCUMENT BODY */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-800 text-sm leading-relaxed bg-[#f8fafc]">
          {activeTab === "paginated" ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-10 shadow-sm min-h-[500px]">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-6 text-xs text-slate-400 font-mono">
                <span className="uppercase font-bold text-blue-700">HemoLink Privacy Framework</span>
                <span>Page {currentPage} of 7</span>
              </div>

              {/* PAGE 1 */}
              {currentPage === 1 && (
                <div className="space-y-6">
                  <div className="border-b pb-4">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight font-display mb-2">
                      PRIVACY POLICY
                    </h1>
                    <p className="text-slate-700">
                      This Privacy Policy explains how HemoLink (“Platform”, “Application”, “we”, “us”, or “our”) collects, uses, stores, and protects information when you use our Blood Donation Application. We take user privacy seriously, particularly because the Application may process personal information related to blood donation and emergency requests.
                    </p>
                  </div>

                  <section className="space-y-4">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-mono font-bold">1</span>
                      Information We Collect
                    </h3>
                    <p className="text-slate-700 text-sm">
                      Depending on how you use the Application, we may collect information such as:
                    </p>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">Account Information</h4>
                      <ul className="grid grid-cols-2 gap-1.5 pl-4 text-xs text-slate-700 list-disc">
                        <li>Name</li>
                        <li>Email address</li>
                        <li>Authentication information</li>
                        <li>User ID</li>
                      </ul>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">Donor Information</h4>
                      <p className="text-xs text-slate-600 mb-1">If you register as a donor, we may collect:</p>
                      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pl-4 text-xs text-slate-700 list-disc">
                        <li>Full name</li>
                        <li>Email address</li>
                        <li>Phone number</li>
                        <li>Age</li>
                        <li>Gender</li>
                        <li>Blood group</li>
                        <li>City</li>
                        <li>State</li>
                        <li>Pincode</li>
                        <li>Donor availability</li>
                        <li>Last donation date</li>
                        <li>Donation count</li>
                        <li>Account creation and update timestamps</li>
                      </ul>
                    </div>
                  </section>
                </div>
              )}

              {/* PAGE 2 */}
              {currentPage === 2 && (
                <div className="space-y-6">
                  <section className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">Blood Request Information</h4>
                    <p className="text-slate-700 text-sm">When submitting a blood request, we may collect:</p>
                    <ul className="grid grid-cols-2 gap-1.5 pl-4 text-xs text-slate-700 list-disc">
                      <li>Patient name</li>
                      <li>Required blood group</li>
                      <li>Number of units</li>
                      <li>Hospital name</li>
                      <li>Hospital address</li>
                      <li>City</li>
                      <li>State</li>
                      <li>Urgency level</li>
                      <li>Additional notes</li>
                      <li>Request status</li>
                      <li>Request creation time</li>
                      <li>Request expiration time</li>
                    </ul>
                  </section>

                  <section className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">Notification Information</h4>
                    <p className="text-slate-700 text-sm">We may collect information related to notifications, including:</p>
                    <ul className="grid grid-cols-2 gap-1.5 pl-4 text-xs text-slate-700 list-disc">
                      <li>Notification ID</li>
                      <li>Notification type</li>
                      <li>Notification message</li>
                      <li>Recipient information</li>
                      <li>Notification timestamp</li>
                      <li>Read/unread status</li>
                      <li>Related request information</li>
                    </ul>
                  </section>

                  <section className="space-y-3 pt-3 border-t border-slate-200">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-mono font-bold">2</span>
                      How We Use Information
                    </h3>
                    <p className="text-slate-700 text-sm">We may use collected information to:</p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-4 text-xs text-slate-700 list-disc">
                      <li>Create and manage user accounts</li>
                      <li>Maintain donor profiles</li>
                      <li>Help users find potential donors</li>
                      <li>Process blood requests</li>
                      <li>Facilitate communication between users</li>
                    </ul>
                  </section>
                </div>
              )}

              {/* PAGE 3 */}
              {currentPage === 3 && (
                <div className="space-y-6">
                  <section className="space-y-2">
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-4 text-xs text-slate-700 list-disc">
                      <li>Send notifications</li>
                      <li>Maintain application functionality</li>
                      <li>Improve the Application</li>
                      <li>Detect misuse and fraudulent activity</li>
                      <li>Protect the security of users and the Application</li>
                      <li>Troubleshoot technical problems</li>
                      <li>Maintain records required for legitimate operational purposes</li>
                    </ul>
                    <p className="text-xs text-slate-600 italic mt-2">
                      We will not use personal information for unrelated purposes unless permitted or required by applicable law or with appropriate consent where required.
                    </p>
                  </section>

                  <section className="space-y-3 pt-3 border-t border-slate-200">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-mono font-bold">3</span>
                      Donor Search and Information Visibility
                    </h3>
                    <p className="text-slate-700 text-sm">
                      The purpose of the Application is to help users identify potential blood donors. Depending on the Application’s features and privacy settings, certain donor information may be made available to authenticated users or other permitted users. We aim to minimize the exposure of unnecessary personal information. For example, the Application should only expose contact information where it is reasonably necessary for legitimate blood-donation coordination.
                    </p>
                  </section>

                  <section className="space-y-3 pt-3 border-t border-slate-200">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-mono font-bold">4</span>
                      Emergency Request Information
                    </h3>
                    <p className="text-slate-700 text-sm">
                      Information submitted through emergency blood requests may be visible to users for the purpose of helping coordinate blood donation. Users should not submit unnecessary sensitive information in emergency-request notes.
                    </p>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                      <p className="font-bold mb-1">Do not include in free-text fields:</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        <li>Passwords</li>
                        <li>Financial information</li>
                        <li>Government identification numbers</li>
                        <li>Authentication credentials</li>
                        <li>Unnecessary medical details</li>
                      </ul>
                    </div>
                  </section>

                  <section className="space-y-2 pt-3 border-t border-slate-200">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-mono font-bold">5</span>
                      Authentication
                    </h3>
                    <p className="text-slate-700 text-sm">
                      The Application may use third-party authentication services to securely manage user accounts. Authentication providers may process information according to their respective privacy policies and terms.
                    </p>
                  </section>
                </div>
              )}

              {/* PAGE 4 */}
              {currentPage === 4 && (
                <div className="space-y-6">
                  <section className="space-y-3">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-mono font-bold">6</span>
                      Database and Cloud Storage
                    </h3>
                    <p className="text-slate-700 text-sm">
                      Application information may be stored using cloud infrastructure and database services. For example, the Application may use Firebase/Firestore or similar cloud services for:
                    </p>
                    <ul className="grid grid-cols-2 gap-1.5 pl-4 text-xs text-slate-700 list-disc">
                      <li>User data</li>
                      <li>Donor profiles</li>
                      <li>Blood requests</li>
                      <li>Notifications</li>
                      <li>Application records</li>
                    </ul>
                    <p className="text-xs text-slate-600">
                      Data stored through third-party services may be processed according to the applicable provider’s policies and contractual terms.
                    </p>
                  </section>

                  <section className="space-y-3 pt-3 border-t border-slate-200">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-mono font-bold">7</span>
                      Information Sharing
                    </h3>
                    <p className="text-slate-700 text-sm">
                      We do not intend to sell personal information to third parties. Information may be shared or made available when necessary to operate the Application, such as:
                    </p>
                    <ul className="space-y-1 pl-4 text-xs text-slate-700 list-disc">
                      <li>With other authorized users for blood-donation coordination</li>
                      <li>With service providers that support the Application</li>
                      <li>When required by law</li>
                      <li>To investigate fraud or abuse</li>
                      <li>To protect users, the public, or the security of the Application</li>
                      <li>When necessary to respond to legal processes</li>
                    </ul>
                    <p className="text-xs text-slate-600">
                      We will seek to limit disclosure to information reasonably necessary for the relevant purpose.
                    </p>
                  </section>

                  <section className="space-y-3 pt-3 border-t border-slate-200">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-mono font-bold">8</span>
                      Third-Party Service Providers
                    </h3>
                    <p className="text-slate-700 text-sm">
                      The Application may use third-party providers for services such as:
                    </p>
                    <ul className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pl-4 text-xs text-slate-700 list-disc">
                      <li>Authentication</li>
                      <li>Cloud database</li>
                      <li>Hosting</li>
                      <li>Analytics</li>
                      <li>Email</li>
                      <li>SMS</li>
                      <li>Notifications</li>
                      <li>Security & Error monitoring</li>
                    </ul>
                    <p className="text-xs text-slate-600">
                      These providers may process certain information as necessary to provide their services.
                    </p>
                  </section>
                </div>
              )}

              {/* PAGE 5 */}
              {currentPage === 5 && (
                <div className="space-y-6">
                  <p className="text-xs text-slate-600">
                    Users should review the privacy policies of relevant third-party providers where appropriate.
                  </p>

                  <section className="space-y-3">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-mono font-bold">9</span>
                      Data Security
                    </h3>
                    <p className="text-slate-700 text-sm">
                      We take reasonable technical and organizational measures to protect personal information against unauthorized access, alteration, disclosure, or destruction. However, no Internet-based service can guarantee absolute security. Users are responsible for keeping their account credentials secure and should notify us if they believe their account has been compromised.
                    </p>
                  </section>

                  <section className="space-y-3 pt-3 border-t border-slate-200">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-mono font-bold">10</span>
                      Data Retention
                    </h3>
                    <p className="text-slate-700 text-sm">We retain personal information for as long as reasonably necessary to:</p>
                    <ul className="grid grid-cols-2 gap-1.5 pl-4 text-xs text-slate-700 list-disc">
                      <li>Provide the Application</li>
                      <li>Maintain user accounts</li>
                      <li>Support blood-donation coordination</li>
                      <li>Maintain security</li>
                      <li>Meet legal or regulatory obligations</li>
                      <li>Resolve disputes</li>
                      <li>Enforce our Terms</li>
                    </ul>
                    <p className="text-xs text-slate-600">
                      Retention periods may vary depending on the type of information and the purpose for which it is processed.
                    </p>
                  </section>

                  <section className="space-y-3 pt-3 border-t border-slate-200">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-mono font-bold">11</span>
                      Account Deletion
                    </h3>
                    <p className="text-slate-700 text-sm">
                      Where supported by the Application, users may request deletion of their account and associated personal information. Some information may need to be retained where required by law, necessary for security, fraud prevention, dispute resolution, or other legitimate purposes. Contact us using the details below to request account deletion or data-related assistance.
                    </p>
                  </section>

                  <section className="space-y-3 pt-3 border-t border-slate-200">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-mono font-bold">12</span>
                      Your Privacy Rights
                    </h3>
                    <p className="text-slate-700 text-sm">
                      Depending on the laws applicable to you, you may have rights relating to your personal information, which may include:
                    </p>
                    <ul className="space-y-1 pl-4 text-xs text-slate-700 list-disc">
                      <li>Requesting access to your information</li>
                      <li>Requesting correction of inaccurate information</li>
                      <li>Requesting deletion of information</li>
                      <li>Requesting information about how your data is used</li>
                      <li>Withdrawing consent where applicable</li>
                      <li>Objecting to certain processing</li>
                      <li>Requesting restriction of certain processing</li>
                    </ul>
                  </section>
                </div>
              )}

              {/* PAGE 6 */}
              {currentPage === 6 && (
                <div className="space-y-6">
                  <p className="text-xs text-slate-500 italic">
                    The availability of these rights depends on applicable law and circumstances.
                  </p>

                  <section className="space-y-3">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-mono font-bold">13</span>
                      Children’s Privacy
                    </h3>
                    <p className="text-slate-700 text-sm">
                      The Application is not intended for children who are not legally permitted to use the service. We do not knowingly collect personal information from children in violation of applicable law. If you believe that a child has provided personal information improperly, please contact us so that we can review and take appropriate action.
                    </p>
                  </section>

                  <section className="space-y-3 pt-3 border-t border-slate-200">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-mono font-bold">14</span>
                      Cookies and Similar Technologies
                    </h3>
                    <p className="text-slate-700 text-sm">
                      The Application may use cookies, local storage, session storage, or similar technologies for purposes such as:
                    </p>
                    <ul className="grid grid-cols-2 gap-1.5 pl-4 text-xs text-slate-700 list-disc">
                      <li>Authentication</li>
                      <li>Session management</li>
                      <li>Security</li>
                      <li>Preferences</li>
                      <li>Application functionality</li>
                      <li>Analytics</li>
                    </ul>
                  </section>

                  <section className="space-y-3 pt-3 border-t border-slate-200">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-mono font-bold">15</span>
                      Analytics
                    </h3>
                    <p className="text-slate-700 text-sm">
                      If analytics services are enabled, we may collect technical information such as: browser type, device type, operating system, approximate location information, application usage, pages or screens visited, and technical error information to improve performance and reliability.
                    </p>
                  </section>

                  <section className="space-y-3 pt-3 border-t border-slate-200">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-mono font-bold">16</span>
                      Location Information
                    </h3>
                    <p className="text-slate-700 text-sm">
                      The Application may collect or use location-related information such as city, state, or pincode when necessary to help users identify potential donors or blood requests in relevant areas. We will not request precise device location unless it is necessary for a feature and appropriately disclosed.
                    </p>
                  </section>
                </div>
              )}

              {/* PAGE 7 */}
              {currentPage === 7 && (
                <div className="space-y-6">
                  <section className="space-y-3 bg-red-50 border border-red-200 p-4 rounded-xl">
                    <h3 className="text-base font-bold text-red-950 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-red-200 text-red-800 text-xs flex items-center justify-center font-mono font-bold">17</span>
                      Medical Information Disclaimer
                    </h3>
                    <p className="text-xs text-red-900">
                      The Application may contain blood-group or donation-related information provided by users. We do not independently verify all medical information submitted by users. The Application is not a medical service and should not be used as a substitute for medical professionals, hospitals, laboratories, or authorized blood banks.
                    </p>
                  </section>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <section className="space-y-2 border border-slate-200 p-3 rounded-xl bg-slate-50">
                      <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] flex items-center justify-center font-mono">18</span>
                        Data Accuracy
                      </h4>
                      <p className="text-xs text-slate-600">
                        Users are responsible for ensuring that the personal information they provide is accurate and up to date.
                      </p>
                    </section>

                    <section className="space-y-2 border border-slate-200 p-3 rounded-xl bg-slate-50">
                      <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] flex items-center justify-center font-mono">19</span>
                        Data Breach
                      </h4>
                      <p className="text-xs text-slate-600">
                        If we become aware of a security incident involving personal information, we will take reasonable steps to investigate, contain, and respond.
                      </p>
                    </section>
                  </div>

                  <section className="space-y-2 border-t border-slate-200 pt-3">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-mono font-bold">20</span>
                      Changes to This Privacy Policy
                    </h3>
                    <p className="text-slate-700 text-sm">
                      We may update this Privacy Policy from time to time. When changes are made, we will update the “Last Updated” date. Where required by applicable law, we will provide additional notice or obtain consent for material changes.
                    </p>
                  </section>

                  {/* 21. Contact Us */}
                  <section className="space-y-3 bg-slate-100 border border-slate-200 p-4 rounded-xl">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-200 text-blue-900 text-xs flex items-center justify-center font-mono font-bold">21</span>
                      Contact Us
                    </h3>
                    <p className="text-slate-700 text-xs">
                      For privacy-related questions, requests, complaints, or concerns, contact:
                    </p>
                    <div className="mt-2 text-xs space-y-1 font-mono text-slate-800">
                      <p><span className="font-bold">Application:</span> HemoLink</p>
                      <p><span className="font-bold">Privacy Email:</span> srini16dinesh@gmail.com</p>
                      <p><span className="font-bold">Support Email:</span> sultan82204@gmail.com</p>
                      <p><span className="font-bold">Phone:</span> +91 8220423711</p>
                      <p><span className="font-bold">Address:</span> Manapparai, Tiruchirapalli</p>
                    </div>
                  </section>

                  {/* 22. Acceptance */}
                  <section className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <h3 className="text-base font-bold text-blue-950 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-mono font-bold">22</span>
                      Acceptance
                    </h3>
                    <p className="text-blue-900 text-xs font-medium">
                      By using the Application, you acknowledge that you have read and understood this Privacy Policy. If you do not agree with the practices described in this Privacy Policy, please discontinue use of the Application.
                    </p>
                  </section>
                </div>
              )}
            </div>
          ) : (
            /* CONTINUOUS VIEW WITH ALL 22 SECTIONS */
            <div className="space-y-8 max-w-3xl mx-auto">
              {/* Document Title Header */}
              <div className="border-b border-slate-200 pb-6 text-center space-y-2">
                <span className="text-xs font-mono font-bold text-blue-600 uppercase tracking-widest">
                  Official Privacy Framework
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
                  PRIVACY POLICY
                </h1>
                <p className="text-slate-600 text-sm max-w-2xl mx-auto">
                  This Privacy Policy explains how HemoLink (“Platform”, “Application”, “we”, “us”, or “our”) collects, uses, stores, and protects information when you use our Blood Donation Application. We take user privacy seriously, particularly because the Application may process personal information related to blood donation and emergency requests.
                </p>
              </div>

              {/* 1. Information We Collect */}
              <section className="space-y-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-mono font-bold">1</span>
                  Information We Collect
                </h3>
                <p className="text-slate-700 text-sm">
                  Depending on how you use the Application, we may collect information such as:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono mb-2">Account Information</h4>
                    <ul className="space-y-1 pl-4 text-xs text-slate-700 list-disc">
                      <li>Name</li>
                      <li>Email address</li>
                      <li>Authentication information</li>
                      <li>User ID</li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono mb-2">Donor Information</h4>
                    <ul className="space-y-1 pl-4 text-xs text-slate-700 list-disc">
                      <li>Full name, Phone number, Email address</li>
                      <li>Age, Gender, Blood group</li>
                      <li>City, State, Pincode</li>
                      <li>Donor availability & Last donation date</li>
                      <li>Donation count & Timestamps</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono mb-2">Blood Request & Notification Information</h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 pl-4 text-xs text-slate-700 list-disc">
                    <li>Patient name & Required blood group</li>
                    <li>Number of units required & Urgency level</li>
                    <li>Hospital name & address (City, State)</li>
                    <li>Request creation, status, and expiration times</li>
                    <li>Notification ID, type, message, and read/unread status</li>
                  </ul>
                </div>
              </section>

              {/* 2. How We Use Information */}
              <section className="space-y-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-mono font-bold">2</span>
                  How We Use Information
                </h3>
                <p className="text-slate-700 text-sm">We may use collected information to:</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-4 text-xs text-slate-700 list-disc">
                  <li>Create and manage user accounts</li>
                  <li>Maintain donor profiles</li>
                  <li>Help users find potential donors</li>
                  <li>Process blood requests</li>
                  <li>Facilitate communication between users</li>
                  <li>Send notifications & maintain app functionality</li>
                  <li>Improve the Application & troubleshoot problems</li>
                  <li>Detect misuse and fraudulent activity</li>
                  <li>Protect the security of users and the Application</li>
                  <li>Maintain records required for operational purposes</li>
                </ul>
              </section>

              {/* 3. Donor Search & 4. Emergency Request Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <section className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] flex items-center justify-center font-mono font-bold">3</span>
                    Donor Search & Visibility
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    The Application aims to minimize unnecessary exposure of personal information. Contact information is only displayed where reasonably necessary for legitimate blood-donation coordination.
                  </p>
                </section>

                <section className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] flex items-center justify-center font-mono font-bold">4</span>
                    Emergency Request Information
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Information submitted may be visible to coordinate assistance. Do not include passwords, financial data, govt ID numbers, or unnecessary private medical details in free-text fields.
                  </p>
                </section>
              </div>

              {/* 5, 6, 7, 8 */}
              <section className="space-y-4">
                <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-mono font-bold">5-8</span>
                    Infrastructure, Cloud Storage & Third Parties
                  </h3>
                  <p className="text-xs text-slate-700">
                    <strong>Authentication & Cloud Storage:</strong> Secure storage may be hosted using cloud infrastructure such as Firebase/Firestore for user profiles, blood requests, and logs.
                  </p>
                  <p className="text-xs text-slate-700">
                    <strong>Information Sharing:</strong> We do not sell personal information. Disclosures are strictly limited to authorized users for blood donation, service providers, or when required by legal processes.
                  </p>
                  <p className="text-xs text-slate-700">
                    <strong>Third-Party Providers:</strong> Providers handling authentication, cloud databases, hosting, SMS/email, and security analytics operate under their respective privacy policies.
                  </p>
                </div>
              </section>

              {/* 9, 10, 11, 12 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] flex items-center justify-center font-mono font-bold">9</span>
                    Data Security
                  </h4>
                  <p className="text-xs text-slate-600">
                    Reasonable technical safeguards protect data against unauthorized alteration or disclosure. Users are responsible for safeguarding account credentials.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] flex items-center justify-center font-mono font-bold">10</span>
                    Data Retention
                  </h4>
                  <p className="text-xs text-slate-600">
                    Information is retained as long as reasonably necessary to provide services, support coordination, maintain security, and meet legal obligations.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] flex items-center justify-center font-mono font-bold">11</span>
                    Account Deletion
                  </h4>
                  <p className="text-xs text-slate-600">
                    Users may request deletion of their account and personal details by contacting us, subject to legitimate fraud prevention or legal retention requirements.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] flex items-center justify-center font-mono font-bold">12</span>
                    Your Privacy Rights
                  </h4>
                  <p className="text-xs text-slate-600">
                    Depending on jurisdiction, users may request access, correction, deletion, withdrawal of consent, or restriction of processing for personal records.
                  </p>
                </div>
              </div>

              {/* 13 to 16 */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2 text-xs text-slate-700">
                <h4 className="font-bold text-slate-900 text-sm">Technologies, Analytics & Location Information (13 - 16)</h4>
                <p><strong>Children's Privacy:</strong> Not intended for children not legally permitted. Unintentional submissions will be reviewed and removed.</p>
                <p><strong>Cookies & Local Storage:</strong> Used for authentication tokens, session management, theme preferences, and functional performance.</p>
                <p><strong>Analytics:</strong> Technical metrics (browser, OS, screens viewed) improve app reliability.</p>
                <p><strong>Location Information:</strong> City, state, or pincode assist in connecting local blood donors. Precise device GPS is never accessed without consent.</p>
              </div>

              {/* 17. Medical Information Disclaimer */}
              <section className="space-y-3 bg-red-50 border border-red-200 p-4 rounded-xl">
                <h3 className="text-base font-bold text-red-950 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-200 text-red-800 text-xs flex items-center justify-center font-mono font-bold">17</span>
                  Medical Information Disclaimer
                </h3>
                <p className="text-xs text-red-900">
                  The Application contains blood-group and donation details provided directly by users. HemoLink does not independently verify all medical information. The Application is not a hospital or licensed medical facility and cannot substitute for certified laboratories or blood banks.
                </p>
              </section>

              {/* 18, 19, 20 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-700">
                <div className="border border-slate-200 p-3 rounded-xl">
                  <h4 className="font-bold text-slate-900 mb-1">18. Data Accuracy</h4>
                  <p>Users must provide truthful data and keep contact details updated.</p>
                </div>
                <div className="border border-slate-200 p-3 rounded-xl">
                  <h4 className="font-bold text-slate-900 mb-1">19. Data Breach</h4>
                  <p>In incident scenarios, prompt investigations and mandated notices will be enacted.</p>
                </div>
                <div className="border border-slate-200 p-3 rounded-xl">
                  <h4 className="font-bold text-slate-900 mb-1">20. Policy Changes</h4>
                  <p>Updates will be posted with updated timestamps; continued usage implies consent.</p>
                </div>
              </div>

              {/* 21. Contact Us */}
              <section className="space-y-3 bg-slate-100 border border-slate-200 p-5 rounded-xl">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-200 text-blue-900 text-xs flex items-center justify-center font-mono font-bold">21</span>
                  Contact Us
                </h3>
                <p className="text-slate-700 text-xs">
                  For privacy-related questions, requests, complaints, or concerns, contact:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-slate-800 pt-1">
                  <div className="space-y-1">
                    <p><span className="font-bold">Application:</span> HemoLink</p>
                    <p><span className="font-bold">Privacy Email:</span> srini16dinesh@gmail.com</p>
                    <p><span className="font-bold">Support Email:</span> sultan82204@gmail.com</p>
                  </div>
                  <div className="space-y-1">
                    <p><span className="font-bold">Phone:</span> +91 8220423711</p>
                    <p><span className="font-bold">Address:</span> Manapparai, Tiruchirapalli</p>
                  </div>
                </div>
              </section>

              {/* 22. Acceptance */}
              <section className="space-y-3 p-5 bg-blue-50 border border-blue-200 rounded-xl">
                <h3 className="text-base font-bold text-blue-950 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-mono font-bold">22</span>
                  Acceptance
                </h3>
                <p className="text-blue-900 text-xs font-medium">
                  By using the Application, you acknowledge that you have read and understood this Privacy Policy. If you do not agree with the practices described in this Privacy Policy, please discontinue use of the Application.
                </p>
              </section>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="bg-white border-t border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Official HemoLink Privacy Policy Agreement</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={() => {
                if (onAcknowledge) onAcknowledge();
                onClose();
              }}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Acknowledge Policy</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
