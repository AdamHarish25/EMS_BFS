"use client";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Mail, Trash2, Plus, User, AlertCircle } from "lucide-react";

export default function EmailAlertsManager() {
  const { t } = useLanguage();
  const [emails, setEmails] = useState<any[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [addedBy, setAddedBy] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [alarmDuration, setAlarmDuration] = useState<number>(5);

  useEffect(() => {
    const saved = localStorage.getItem('ems-alarm-duration');
    if (saved) {
      setAlarmDuration(parseInt(saved, 10));
    }
  }, []);

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseInt(e.target.value, 10) || 1;
    if (val > 15) val = 15;
    if (val < 1) val = 1;
    setAlarmDuration(val);
    localStorage.setItem('ems-alarm-duration', val.toString());
  };

  const fetchEmails = async () => {
    try {
      const res = await fetch("/api/emails");
      if (res.ok) {
        const data = await res.json();
        setEmails(data);
      }
    } catch (err) {
      console.error("Gagal menarik daftar email:", err);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, added_by: addedBy }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal menambahkan email");
      }
      setNewEmail("");
      setAddedBy("");
      fetchEmails();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmail = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus email ini?")) return;
    try {
      const res = await fetch(`/api/emails/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchEmails();
      }
    } catch (err) {
      console.error("Gagal menghapus email:", err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
          Manajemen Email Alert
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Kelola daftar email yang menerima notifikasi peringatan parameter kritis dari EMS.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Kolom Kiri: Form & Pengaturan */}
        <div className="lg:col-span-1 space-y-6">
          {/* Pengaturan Alarm */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Pengaturan Alarm
            </h2>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Interval Anti-Spam Email (Menit)
              </label>
              <p className="text-xs text-slate-500 mb-3">
                Maksimal 15 menit. Tentukan jeda waktu antar pengiriman email jika anomali masih terjadi.
              </p>
              <input
                type="number"
                min="1"
                max="15"
                value={alarmDuration}
                onChange={handleDurationChange}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-slate-100 transition-all"
              />
            </div>
          </div>

          {/* Form Tambah Email */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-500" />
              Tambah Email Baru
            </h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-2 text-red-500 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleAddEmail} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Alamat Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="contoh@dankosfarma.com"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-slate-100 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Ditambahkan Oleh
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={addedBy}
                    onChange={(e) => setAddedBy(e.target.value)}
                    placeholder="Nama Anda"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-slate-100 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? "Menyimpan..." : "Simpan Email"}
              </button>
            </form>
          </div>
        </div>

        {/* Daftar Email */}
        <div className="lg:col-span-2">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-emerald-500" />
              Daftar Penerima Alert ({emails.length})
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">ID</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Ditambahkan Oleh</th>
                    <th className="px-4 py-3 text-right rounded-tr-lg">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {emails.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        Belum ada email yang ditambahkan.
                      </td>
                    </tr>
                  ) : (
                    emails.map((email) => (
                      <tr key={email.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                          #{email.id}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          {email.email}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {email.added_by || "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteEmail(email.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
