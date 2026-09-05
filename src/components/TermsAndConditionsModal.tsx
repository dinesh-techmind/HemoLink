import React, { useState } from "react";
import {
  X,
  FileText,
  ShieldCheck,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  ExternalLink,
  Info
} from "lucide-react";

interface TermsAndConditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export default function TermsAndConditionsModal({
  isOpen,
  onClose,
  onAccept,
}: TermsAndConditionsModalProps) {
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
        <div className="bg-[#ba1111] text-white px-5 py-4 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-mono tracking-widest text-white/80 font-bold">HemoLink Legal</span>
                <span className="bg-white/20 text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">7 Pages • Official</span>
              </div>
              <h2 className="text-lg font-bold tracking-tight text-white leading-tight">
                Terms & Conditions
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              title="Print Document"
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTROLS BAR: VIEW MODE SWITCHER & PAGINATION */}
        <div className="bg-gray-50 border-b border-gray-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-medium text-[11px]">View Mode:</span>
            <div className="bg-gray-200 p-0.5 rounded-lg flex items-center font-bold text-[11px]">
              <button
                onClick={() => setActiveTab("continuous")}
                className={`px-3 py-1 rounded-md transition ${
                  activeTab === "continuous"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Continuous Document
              </button>
              <button
                onClick={() => setActiveTab("paginated")}
                className={`px-3 py-1 rounded-md transition ${
                  activeTab === "paginated"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
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
                className="p-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono font-bold text-gray-700 text-xs px-2">
                Page {currentPage} of 7
              </span>
              <button
                disabled={currentPage >= 7}
                onClick={() => setCurrentPage((p) => Math.min(7, p + 1))}
                className="p-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="text-[11px] text-gray-500 flex items-center gap-1 font-mono">
            <Info className="w-3.5 h-3.5 text-[#ba1111]" />
            <span>Emergency Coordination & Disclaimer</span>
          </div>
        </div>

        {/* DOCUMENT BODY */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-gray-800 text-sm leading-relaxed bg-[#fdfdfd]">
          {activeTab === "paginated" ? (
            <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-10 shadow-sm min-h-[500px]">
              <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-6 text-xs text-gray-400 font-mono">
                <span className="uppercase font-bold text-[#ba1111]">HemoLink Application Agreement</span>
                <span>Page {currentPage} of 7</span>
              </div>

              {currentPage === 1 && (
                <div className="space-y-6">
                  <div className="border-b pb-4">
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight font-display mb-2">
                      TERMS & CONDITIONS
                    </h1>
                    <p className="text-gray-700">
                      Welcome to HemoLink. This platform is designed to help individuals find potential blood donors and submit or respond to blood donation requests. By accessing or using this Application, you agree to comply with these Terms & Conditions. If you do not agree with these terms, please do not use the Application.
                    </p>
                  </div>

                  <section className="space-y-3">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-red-100 text-[#ba1111] text-xs flex items-center justify-center font-mono font-bold">1</span>
                      Purpose of the Platform
                    </h3>
                    <p className="text-gray-700 text-sm">
                      The Application provides a technology platform intended to facilitate communication between people who may need blood and potential blood donors. The Application may provide features such as:
                    </p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-4 text-xs text-gray-700 list-disc">
                      <li>Donor registration</li>
                      <li>Donor profiles</li>
                      <li>Blood group information</li>
                      <li>Donor availability</li>
                      <li>Donor search</li>
                      <li>Emergency blood requests</li>
                      <li>Hospital/request information</li>
                      <li>Notifications</li>
                      <li>Communication between users</li>
                      <li>Request status tracking</li>
                    </ul>
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 font-medium">
                      The Application is a coordination and information platform. It is not a hospital, blood bank, medical organization, ambulance service, or emergency medical service.
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-red-100 text-[#ba1111] text-xs flex items-center justify-center font-mono font-bold">2</span>
                      No Medical Advice
                    </h3>
                    <p className="text-gray-700 text-sm">
                      Information provided through this Application is for general informational and coordination purposes only. The Application does not:
                    </p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-4 text-xs text-gray-700 list-disc">
                      <li>Provide medical diagnosis</li>
                      <li>Provide medical treatment</li>
                      <li>Determine whether a person is medically eligible to donate blood</li>
                      <li>Guarantee blood compatibility</li>
                      <li>Replace professional medical advice</li>
                      <li>Replace a hospital or licensed blood bank</li>
                      <li>Guarantee the availability or safety of blood</li>
                      <li>Guarantee that a donor is medically fit to donate</li>
                    </ul>
                  </section>
                </div>
              )}

              {currentPage === 2 && (
                <div className="space-y-6">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium">
                    Users should consult qualified medical professionals and authorized blood banks for medical decisions and blood transfusion requirements. In an emergency, users should contact appropriate emergency medical services and/or the nearest hospital or authorized blood bank immediately.
                  </div>

                  <section className="space-y-3">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-red-100 text-[#ba1111] text-xs flex items-center justify-center font-mono font-bold">3</span>
                      User Registration
                    </h3>
                    <p className="text-gray-700 text-sm">
                      Some features may require you to create an account. When registering, you agree to provide accurate and current information. Depending on the features you use, information may include:
                    </p>
                    <ul className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pl-4 text-xs text-gray-700 list-disc">
                      <li>Name</li>
                      <li>Email address</li>
                      <li>Phone number</li>
                      <li>Age</li>
                      <li>Gender</li>
                      <li>Blood group</li>
                      <li>City</li>
                      <li>State</li>
                      <li>Pincode</li>
                      <li>Donor availability</li>
                      <li>Donation-related information</li>
                    </ul>
                    <p className="text-xs text-gray-600 italic">
                      You are responsible for ensuring that the information you provide is accurate. You must not intentionally provide false, misleading, fraudulent, or impersonated information.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-red-100 text-[#ba1111] text-xs flex items-center justify-center font-mono font-bold">4</span>
                      Donor Information
                    </h3>
                    <p className="text-gray-700 text-sm">
                      If you register as a donor, you understand that certain information may be used to help other users identify potentially suitable donors. The Application may display or use donor information according to the platform’s functionality and privacy settings. Users must not misuse donor information, including:
                    </p>
                    <ul className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pl-4 text-xs text-gray-700 list-disc">
                      <li>Harassment</li>
                      <li>Spam</li>
                      <li>Threats</li>
                      <li>Fraud</li>
                      <li>Unwanted commercial communication</li>
                      <li>Stalking</li>
                      <li>Identity theft</li>
                      <li>Unauthorized data collection</li>
                    </ul>
                    <p className="text-xs font-semibold text-gray-800">
                      You must only use donor information for legitimate blood-donation-related purposes.
                    </p>
                  </section>
                </div>
              )}

              {currentPage === 3 && (
                <div className="space-y-6">
                  <section className="space-y-3">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-red-100 text-[#ba1111] text-xs flex items-center justify-center font-mono font-bold">5</span>
                      Blood Donation Eligibility
                    </h3>
                    <p className="text-gray-700 text-sm">
                      Registering as a donor does not mean that you are automatically eligible to donate blood. Your eligibility depends on applicable medical requirements and the assessment of an authorized medical professional or blood bank. You are responsible for confirming your eligibility before donating. Do not donate blood if a qualified medical professional or authorized blood bank determines that you are not eligible.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-red-100 text-[#ba1111] text-xs flex items-center justify-center font-mono font-bold">6</span>
                      Emergency Blood Requests
                    </h3>
                    <p className="text-gray-700 text-sm">
                      Users may submit emergency or non-emergency blood requests through the Application. Users must provide accurate information, including where applicable:
                    </p>
                    <ul className="grid grid-cols-2 gap-1.5 pl-4 text-xs text-gray-700 list-disc">
                      <li>Patient information</li>
                      <li>Required blood group</li>
                      <li>Number of units required</li>
                      <li>Hospital name</li>
                      <li>Hospital location</li>
                      <li>Urgency level</li>
                      <li>Additional information</li>
                    </ul>
                    <p className="text-xs text-gray-700">
                      Emergency requests must only be submitted for genuine blood-donation needs. Users must not create false, misleading, duplicate, abusive, or fraudulent requests. We reserve the right to remove requests that violate these Terms.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-red-100 text-[#ba1111] text-xs flex items-center justify-center font-mono font-bold">7</span>
                      No Guarantee of Donor Availability
                    </h3>
                    <p className="text-gray-700 text-sm">The Application does not guarantee that:</p>
                    <ul className="space-y-1 pl-4 text-xs text-gray-700 list-disc">
                      <li>A donor will respond</li>
                      <li>A donor will be available</li>
                      <li>A donor will be medically eligible</li>
                      <li>A donor will arrive at a hospital</li>
                      <li>The required blood group will be available</li>
                      <li>The required amount of blood will be obtained</li>
                      <li>A blood donation or transfusion will occur</li>
                    </ul>
                    <p className="text-xs font-bold text-red-700">
                      Users should not rely solely on the Application during a medical emergency.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-red-100 text-[#ba1111] text-xs flex items-center justify-center font-mono font-bold">8</span>
                      Blood Group Information
                    </h3>
                    <p className="text-gray-700 text-sm">
                      Blood group information provided by users is user-provided information and may not have been independently verified by the Application. Users must verify blood group information through appropriate medical or laboratory sources when necessary. The Application must not be treated as the final authority for transfusion compatibility.
                    </p>
                  </section>
                </div>
              )}

              {currentPage === 4 && (
                <div className="space-y-6">
                  <section className="space-y-3">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-red-100 text-[#ba1111] text-xs flex items-center justify-center font-mono font-bold">9</span>
                      User Responsibilities
                    </h3>
                    <p className="text-gray-700 text-sm">You agree to:</p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-4 text-xs text-gray-700 list-disc">
                      <li>Provide truthful information</li>
                      <li>Keep your account information secure</li>
                      <li>Use the Application lawfully</li>
                      <li>Respect other users</li>
                      <li>Use donor information responsibly</li>
                      <li>Submit genuine blood requests</li>
                      <li>Avoid harassment or abuse</li>
                      <li>Avoid fraudulent activity</li>
                      <li>Follow applicable laws and regulations</li>
                      <li>Follow instructions from medical professionals and authorized blood banks</li>
                    </ul>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-red-100 text-[#ba1111] text-xs flex items-center justify-center font-mono font-bold">10</span>
                      Prohibited Activities
                    </h3>
                    <p className="text-gray-700 text-sm">You must not use the Application to:</p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-4 text-xs text-gray-700 list-disc">
                      <li>Submit fake emergency requests</li>
                      <li>Impersonate another person</li>
                      <li>Provide intentionally false medical information</li>
                      <li>Harass donors or requesters</li>
                      <li>Collect donor information for unauthorized purposes</li>
                      <li>Send spam</li>
                      <li>Conduct scams or fraud</li>
                      <li>Attempt to access another user’s account</li>
                      <li>Attempt to access unauthorized database information</li>
                      <li>Circumvent security controls</li>
                      <li>Introduce malicious code</li>
                      <li>Interfere with the Application</li>
                      <li>Scrape or automatically collect user information without authorization</li>
                      <li>Use the platform for unlawful purposes</li>
                    </ul>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-red-100 text-[#ba1111] text-xs flex items-center justify-center font-mono font-bold">11</span>
                      User-Generated Information
                    </h3>
                    <p className="text-gray-700 text-sm">
                      You are responsible for information that you submit to the Application. We do not guarantee that user-submitted information is accurate, complete, current, or medically verified. If you discover incorrect information associated with your account, you should update it or contact us where applicable.
                    </p>
                  </section>
                </div>
              )}

              {currentPage === 5 && (
                <div className="space-y-6">
                  <section className="space-y-3">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-red-100 text-[#ba1111] text-xs flex items-center justify-center font-mono font-bold">12</span>
                      Notifications and Communication
                    </h3>
                    <p className="text-gray-700 text-sm">The Application may provide notifications relating to:</p>
                    <ul className="grid grid-cols-2 gap-1.5 pl-4 text-xs text-gray-700 list-disc">
                      <li>Blood requests</li>
                      <li>Donor availability</li>
                      <li>Emergency requests</li>
                      <li>Request status</li>
                      <li>Account activity</li>
                      <li>Application updates</li>
                    </ul>
                    <p className="text-xs text-gray-600">
                      Notifications may be delivered through available channels such as in-app notifications, email, SMS, or other supported methods. Delivery of a notification is not guaranteed. Users should not rely exclusively on Application notifications for time-critical medical emergencies.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-red-100 text-[#ba1111] text-xs flex items-center justify-center font-mono font-bold">13</span>
                      Third-Party Services
                    </h3>
                    <p className="text-gray-700 text-sm">
                      The Application may use third-party services to provide functionality, including authentication, database storage, analytics, hosting, messaging, or other technical services. These services may process information according to their own terms and privacy policies.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-red-100 text-[#ba1111] text-xs flex items-center justify-center font-mono font-bold">14</span>
                      Application Availability
                    </h3>
                    <p className="text-gray-700 text-sm">
                      We attempt to keep the Application available and functioning correctly, but we do not guarantee uninterrupted availability. The Application may become temporarily unavailable due to:
                    </p>
                    <ul className="grid grid-cols-2 gap-1.5 pl-4 text-xs text-gray-700 list-disc">
                      <li>Maintenance</li>
                      <li>Technical problems</li>
                      <li>Internet connectivity</li>
                      <li>Third-party service failures</li>
                      <li>Server problems</li>
                      <li>Security incidents</li>
                      <li>Force majeure events</li>
                    </ul>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-red-100 text-[#ba1111] text-xs flex items-center justify-center font-mono font-bold">15</span>
                      Accuracy of Information
                    </h3>
                    <p className="text-gray-700 text-sm">
                      Although we may attempt to maintain accurate information, we do not guarantee that all information on the Application is complete, accurate, current, or error-free. Users should verify important information before relying upon it.
                    </p>
                  </section>
                </div>
              )}

              {currentPage === 6 && (
                <div className="space-y-6">
                  <section className="space-y-3">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-red-100 text-[#ba1111] text-xs flex items-center justify-center font-mono font-bold">16</span>
                      Limitation of Responsibility
                    </h3>
                    <p className="text-gray-700 text-sm">
                      To the extent permitted by applicable law, the Application and its operators are not responsible for:
                    </p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-4 text-xs text-gray-700 list-disc">
                      <li>A donor failing to respond</li>
                      <li>A donor being unavailable</li>
                      <li>Incorrect user-provided information</li>
                      <li>Failure to obtain blood</li>
                      <li>Medical complications</li>
                      <li>Blood transfusion outcomes</li>
                      <li>Actions or behavior of users</li>
                      <li>False emergency requests</li>
                      <li>Communication failures</li>
                      <li>Third-party service failures</li>
                      <li>Internet or network failures</li>
                    </ul>
                    <p className="text-xs text-gray-600">
                      Nothing in these Terms is intended to exclude or limit liability where such exclusion or limitation is prohibited by applicable law.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-red-100 text-[#ba1111] text-xs flex items-center justify-center font-mono font-bold">17</span>
                      Account Suspension or Termination
                    </h3>
                    <p className="text-gray-700 text-sm">We may suspend or terminate accounts that:</p>
                    <ul className="grid grid-cols-2 gap-1.5 pl-4 text-xs text-gray-700 list-disc">
                      <li>Violate these Terms</li>
                      <li>Submit fraudulent requests</li>
                      <li>Abuse other users</li>
                      <li>Attempt unauthorized access</li>
                      <li>Misuse donor information</li>
                      <li>Engage in illegal activity</li>
                      <li>Threaten the security or operation of the Application</li>
                    </ul>
                    <p className="text-xs text-gray-600">Where appropriate and permitted by law, users may request account closure.</p>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-red-100 text-[#ba1111] text-xs flex items-center justify-center font-mono font-bold">18</span>
                      Intellectual Property
                    </h3>
                    <p className="text-gray-700 text-sm">
                      The Application’s software, design, branding, logos, text, graphics, and other original content may be protected by applicable intellectual property laws. You may not copy, reproduce, modify, distribute, reverse engineer, or commercially exploit protected Application content without appropriate authorization.
                    </p>
                  </section>
                </div>
              )}

              {currentPage === 7 && (
                <div className="space-y-6">
                  <section className="space-y-3">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-red-100 text-[#ba1111] text-xs flex items-center justify-center font-mono font-bold">19</span>
                      Changes to These Terms
                    </h3>
                    <p className="text-gray-700 text-sm">
                      We may update these Terms & Conditions from time to time. Updated terms will be published through the Application. Your continued use of the Application after an update may constitute acceptance of the revised Terms, to the extent permitted by applicable law.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-red-100 text-[#ba1111] text-xs flex items-center justify-center font-mono font-bold">20</span>
                      Governing Law
                    </h3>
                    <p className="text-gray-700 text-sm">
                      These Terms shall be interpreted according to the applicable laws and regulations governing the operation of the Application. Any dispute will be handled according to the applicable jurisdiction and laws.
                    </p>
                  </section>

                  <section className="space-y-3 bg-gray-50 border border-gray-200 p-4 rounded-xl">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-red-100 text-[#ba1111] text-xs flex items-center justify-center font-mono font-bold">21</span>
                      Contact
                    </h3>
                    <p className="text-gray-700 text-xs">
                      If you have questions, concerns, complaints, or requests relating to these Terms, contact us:
                    </p>
                    <div className="mt-2 text-xs space-y-1 font-mono text-gray-800">
                      <p><span className="font-bold">Application:</span> HemoLink</p>
                      <p><span className="font-bold">Email:</span> srini16dinesh@gmail.com</p>
                      <p><span className="font-bold">Phone:</span> +91 8220423711</p>
                      <p><span className="font-bold">Address:</span> Manapparai, Tiruchirapalli.</p>
                    </div>
                  </section>

                  <section className="space-y-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <h3 className="text-base font-bold text-red-950 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#ba1111] text-white text-xs flex items-center justify-center font-mono font-bold">22</span>
                      Acceptance
                    </h3>
                    <p className="text-red-900 text-xs font-medium">
                      By creating an account or using the Application, you acknowledge that you have read, understood, and agreed to these Terms & Conditions. If you do not agree with these Terms, please discontinue use of the Application.
                    </p>
                  </section>
                </div>
              )}
            </div>
          ) : (
            /* CONTINUOUS VIEW WITH ALL 22 SECTIONS */
            <div className="space-y-8 max-w-3xl mx-auto">
              {/* Document Title Header */}
              <div className="border-b border-gray-200 pb-6 text-center space-y-2">
                <span className="text-xs font-mono font-bold text-[#ba1111] uppercase tracking-widest">
                  Official Legal Agreement
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight font-display">
                  TERMS & CONDITIONS
                </h1>
                <p className="text-gray-600 text-sm max-w-2xl mx-auto">
                  Welcome to HemoLink. This platform is designed to help individuals find potential blood donors and submit or respond to blood donation requests. By accessing or using this Application, you agree to comply with these Terms & Conditions. If you do not agree with these terms, please do not use the Application.
                </p>
              </div>

              {/* 1. Purpose */}
              <section className="space-y-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-[#ba1111] text-xs flex items-center justify-center font-mono font-bold">1</span>
                  Purpose of the Platform
                </h3>
                <p className="text-gray-700">
                  The Application provides a technology platform intended to facilitate communication between people who may need blood and potential blood donors. The Application may provide features such as:
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-4 text-xs text-gray-700 list-disc">
                  <li>Donor registration</li>
                  <li>Donor profiles</li>
                  <li>Blood group information</li>
                  <li>Donor availability</li>
                  <li>Donor search</li>
                  <li>Emergency blood requests</li>
                  <li>Hospital/request information</li>
                  <li>Notifications</li>
                  <li>Communication between users</li>
                  <li>Request status tracking</li>
                </ul>
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 font-medium">
                  The Application is a coordination and information platform. It is not a hospital, blood bank, medical organization, ambulance service, or emergency medical service.
                </div>
              </section>

              {/* 2. No Medical Advice */}
              <section className="space-y-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-[#ba1111] text-xs flex items-center justify-center font-mono font-bold">2</span>
                  No Medical Advice
                </h3>
                <p className="text-gray-700">
                  Information provided through this Application is for general informational and coordination purposes only. The Application does not:
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-4 text-xs text-gray-700 list-disc">
                  <li>Provide medical diagnosis</li>
                  <li>Provide medical treatment</li>
                  <li>Determine whether a person is medically eligible to donate blood</li>
                  <li>Guarantee blood compatibility</li>
                  <li>Replace professional medical advice</li>
                  <li>Replace a hospital or licensed blood bank</li>
                  <li>Guarantee the availability or safety of blood</li>
                  <li>Guarantee that a donor is medically fit to donate</li>
                </ul>
                <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200 font-medium">
                  Users should consult qualified medical professionals and authorized blood banks for medical decisions and blood transfusion requirements. In an emergency, users should contact appropriate emergency medical services and/or the nearest hospital or authorized blood bank immediately.
                </p>
              </section>

              {/* 3. User Registration */}
              <section className="space-y-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-[#ba1111] text-xs flex items-center justify-center font-mono font-bold">3</span>
                  User Registration
                </h3>
                <p className="text-gray-700">
                  Some features may require you to create an account. When registering, you agree to provide accurate and current information. Depending on the features you use, information may include:
                </p>
                <ul className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pl-4 text-xs text-gray-700 list-disc">
                  <li>Name</li>
                  <li>Email address</li>
                  <li>Phone number</li>
                  <li>Age</li>
                  <li>Gender</li>
                  <li>Blood group</li>
                  <li>City</li>
                  <li>State</li>
                  <li>Pincode</li>
                  <li>Donor availability</li>
                  <li>Donation-related information</li>
                </ul>
                <p className="text-xs text-gray-600 italic">
                  You are responsible for ensuring that the information you provide is accurate. You must not intentionally provide false, misleading, fraudulent, or impersonated information.
                </p>
              </section>

              {/* 4. Donor Information */}
              <section className="space-y-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-[#ba1111] text-xs flex items-center justify-center font-mono font-bold">4</span>
                  Donor Information
                </h3>
                <p className="text-gray-700">
                  If you register as a donor, you understand that certain information may be used to help other users identify potentially suitable donors. The Application may display or use donor information according to the platform’s functionality and privacy settings. Users must not misuse donor information, including:
                </p>
                <ul className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pl-4 text-xs text-gray-700 list-disc">
                  <li>Harassment</li>
                  <li>Spam</li>
                  <li>Threats</li>
                  <li>Fraud</li>
                  <li>Commercial misuse</li>
                  <li>Stalking</li>
                  <li>Identity theft</li>
                  <li>Data scraping</li>
                </ul>
                <p className="text-xs font-semibold text-gray-800">
                  You must only use donor information for legitimate blood-donation-related purposes.
                </p>
              </section>

              {/* 5. Blood Donation Eligibility */}
              <section className="space-y-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-[#ba1111] text-xs flex items-center justify-center font-mono font-bold">5</span>
                  Blood Donation Eligibility
                </h3>
                <p className="text-gray-700">
                  Registering as a donor does not mean that you are automatically eligible to donate blood. Your eligibility depends on applicable medical requirements and the assessment of an authorized medical professional or blood bank. You are responsible for confirming your eligibility before donating. Do not donate blood if a qualified medical professional or authorized blood bank determines that you are not eligible.
                </p>
              </section>

              {/* 6. Emergency Blood Requests */}
              <section className="space-y-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-[#ba1111] text-xs flex items-center justify-center font-mono font-bold">6</span>
                  Emergency Blood Requests
                </h3>
                <p className="text-gray-700">
                  Users may submit emergency or non-emergency blood requests through the Application. Users must provide accurate information, including where applicable: patient information, required blood group, number of units, hospital name & location, and urgency level.
                </p>
                <p className="text-xs text-gray-700">
                  Emergency requests must only be submitted for genuine blood-donation needs. Users must not create false, misleading, duplicate, abusive, or fraudulent requests. We reserve the right to remove requests that violate these Terms.
                </p>
              </section>

              {/* 7. No Guarantee of Donor Availability */}
              <section className="space-y-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-[#ba1111] text-xs flex items-center justify-center font-mono font-bold">7</span>
                  No Guarantee of Donor Availability
                </h3>
                <p className="text-gray-700">
                  The Application does not guarantee that a donor will respond, be available, be medically eligible, arrive at a hospital, that the required blood group will be available, or that a transfusion will occur. Users should not rely solely on the Application during a medical emergency.
                </p>
              </section>

              {/* 8. Blood Group Information */}
              <section className="space-y-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-[#ba1111] text-xs flex items-center justify-center font-mono font-bold">8</span>
                  Blood Group Information
                </h3>
                <p className="text-gray-700">
                  Blood group information provided by users is user-provided information and may not have been independently verified by the Application. Users must verify blood group information through appropriate medical or laboratory sources when necessary. The Application must not be treated as the final authority for transfusion compatibility.
                </p>
              </section>

              {/* 9 & 10. Responsibilities & Prohibitions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <section className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-[#ba1111] text-[10px] flex items-center justify-center font-mono font-bold">9</span>
                    User Responsibilities
                  </h3>
                  <ul className="space-y-1 pl-3 text-xs text-gray-700 list-disc">
                    <li>Provide truthful information</li>
                    <li>Keep account information secure</li>
                    <li>Use the Application lawfully</li>
                    <li>Respect other users</li>
                    <li>Use donor info responsibly</li>
                    <li>Submit genuine requests</li>
                    <li>Avoid harassment or abuse</li>
                    <li>Follow medical instructions</li>
                  </ul>
                </section>

                <section className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-[#ba1111] text-[10px] flex items-center justify-center font-mono font-bold">10</span>
                    Prohibited Activities
                  </h3>
                  <ul className="space-y-1 pl-3 text-xs text-gray-700 list-disc">
                    <li>Submit fake emergency requests</li>
                    <li>Impersonate another person</li>
                    <li>Provide false medical info</li>
                    <li>Harass donors or requesters</li>
                    <li>Send spam, conduct fraud</li>
                    <li>Circumvent security or scrape data</li>
                    <li>Introduce malicious code</li>
                    <li>Unlawful platform use</li>
                  </ul>
                </section>
              </div>

              {/* 11, 12, 13, 14, 15 */}
              <section className="space-y-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-[#ba1111] text-xs flex items-center justify-center font-mono font-bold">11</span>
                  User-Generated Information & Notifications
                </h3>
                <p className="text-gray-700 text-xs">
                  Users are solely responsible for content submitted. Notifications may be delivered via app, email, or SMS, but delivery is not guaranteed. Never rely solely on notifications for time-critical medical situations.
                </p>
              </section>

              {/* 16. Limitation of Responsibility */}
              <section className="space-y-3 bg-red-50/70 border border-red-200 p-4 rounded-xl">
                <h3 className="text-base font-bold text-red-950 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-200 text-[#ba1111] text-xs flex items-center justify-center font-mono font-bold">16</span>
                  Limitation of Responsibility
                </h3>
                <p className="text-xs text-red-900">
                  To the extent permitted by applicable law, the Application and its operators are not responsible for: a donor failing to respond or being unavailable, incorrect user-provided information, failure to obtain blood, medical complications, blood transfusion outcomes, actions or behavior of users, false emergency requests, communication failures, third-party service failures, or network outages.
                </p>
              </section>

              {/* 17, 18, 19, 20 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-700">
                <div className="border border-gray-200 p-3 rounded-xl">
                  <h4 className="font-bold text-gray-900 mb-1">17. Account Suspension / Termination</h4>
                  <p>Accounts violating terms, submitting fraudulent requests, or abusing users may be suspended immediately.</p>
                </div>
                <div className="border border-gray-200 p-3 rounded-xl">
                  <h4 className="font-bold text-gray-900 mb-1">18. Intellectual Property</h4>
                  <p>HemoLink software, branding, and original content are protected by law and cannot be copied or scraped.</p>
                </div>
                <div className="border border-gray-200 p-3 rounded-xl">
                  <h4 className="font-bold text-gray-900 mb-1">19. Changes to These Terms</h4>
                  <p>Terms may be updated periodically. Continued use constitutes acceptance of revised terms.</p>
                </div>
                <div className="border border-gray-200 p-3 rounded-xl">
                  <h4 className="font-bold text-gray-900 mb-1">20. Governing Law</h4>
                  <p>Interpreted according to applicable jurisdiction and laws governing online emergency coordination services.</p>
                </div>
              </div>

              {/* 21. Contact & 22. Acceptance */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-[#ba1111] text-[10px] flex items-center justify-center font-mono font-bold">21</span>
                    Contact Information
                  </h3>
                  <div className="text-xs space-y-1 font-mono text-gray-700">
                    <p><span className="font-bold">Application:</span> HemoLink</p>
                    <p><span className="font-bold">Email:</span> srini16dinesh@gmail.com</p>
                    <p><span className="font-bold">Phone:</span> +91 8220423711</p>
                    <p><span className="font-bold">Address:</span> Manapparai, Tiruchirapalli.</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <h3 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-[#ba1111] text-[10px] flex items-center justify-center font-mono font-bold">22</span>
                    Acceptance
                  </h3>
                  <p className="text-xs text-gray-600">
                    By creating an account or using the Application, you acknowledge that you have read, understood, and agreed to these Terms & Conditions. If you do not agree with these Terms, please discontinue use of the Application.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="bg-gray-50 border-t border-gray-200 px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <ShieldCheck className="w-4 h-4 text-[#ba1111]" />
            <span>Document ID: HL-TC-2026 • Last Reviewed: September 2026</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl font-bold text-xs transition cursor-pointer"
            >
              Close
            </button>
            {onAccept && (
              <button
                onClick={() => {
                  onAccept();
                  onClose();
                }}
                className="flex-1 sm:flex-none px-5 py-2 bg-[#ba1111] hover:bg-[#9a0f0f] text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-[#ba1111]/20 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>I Agree & Accept Terms</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
