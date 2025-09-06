import React, { useEffect, useState, useRef } from "react";

export default function NearMissApp() {
  const [laporan, setLaporan] = useState(() => {
    try {
      const raw = localStorage.getItem("nearMissReports_v1");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("Error parsing localStorage", e);
      return [];
    }
  });

  const [form, setForm] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    lokasi: "",
    kategori: "Operasional",
    deskripsi: "",
    risiko: "Rendah",
    fotoBase64: null,
  });

  const [filter, setFilter] = useState({
    q: "",
    lokasi: "Semua",
    dari: "",
    sampai: "",
    kategori: "Semua",
  });

  const fileInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("nearMissReports_v1", JSON.stringify(laporan));
  }, [laporan]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  }

  function handleFotoChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((s) => ({ ...s, fotoBase64: reader.result }));
    };
    reader.readAsDataURL(file);
  }

  async function tambahLaporan(e) {
    e.preventDefault();
    if (!form.lokasi || !form.deskripsi) {
      alert("Isi lokasi dan deskripsi terlebih dahulu.");
      return;
    }
    const newL = {
      id: Date.now().toString(),
      tanggal: form.tanggal,
      lokasi: form.lokasi,
      kategori: form.kategori,
      deskripsi: form.deskripsi,
      risiko: form.risiko,
      fotoBase64: form.fotoBase64,
      tindakLanjut: false,
      createdAt: new Date().toISOString(),
    };

    // Try to POST to server; fallback to local if server unavailable
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newL),
      });
      if (res.ok) {
        const saved = await res.json();
        setLaporan((s) => [saved, ...s]);
      } else {
        throw new Error("server error");
      }
    } catch (err) {
      // fallback local
      setLaporan((s) => [newL, ...s]);
    }

    setForm({
      tanggal: new Date().toISOString().slice(0, 10),
      lokasi: "",
      kategori: "Operasional",
      deskripsi: "",
      risiko: "Rendah",
      fotoBase64: null,
    });
    if (fileInputRef.current) fileInputRef.current.value = null;
  }

  function hapusLaporan(id) {
    if (!confirm("Hapus laporan ini?")) return;
    // request server then update local
    fetch(`/api/reports/${id}`, { method: "DELETE" }).catch(()=>{});
    setLaporan((s) => s.filter((x) => x.id !== id));
  }

  function toggleTindakLanjut(id) {
    // optimistic update + server request
    setLaporan((s) => s.map((x) => (x.id === id ? { ...x, tindakLanjut: !x.tindakLanjut } : x)));
    fetch(`/api/reports/${id}/followup`, { method: "PUT" }).catch(()=>{});
  }

  function imporJSON(ev) {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error("Format tidak valid");
        setLaporan((s) => [...data, ...s]);
        alert("Impor berhasil");
      } catch (e) {
        alert("Gagal impor: " + e.message);
      }
    };
    reader.readAsText(file);
  }

  function eksporJSON() {
    const blob = new Blob([JSON.stringify(laporan, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `near-miss-reports_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function resetData() {
    if (!confirm("Reset semua data laporan?")) return;
    setLaporan([]);
    fetch("/api/reports/reset", { method: "POST" }).catch(()=>{});
  }

  function applyFilter(items) {
    return items.filter((item) => {
      if (filter.lokasi !== "Semua" && item.lokasi !== filter.lokasi) return false;
      if (filter.kategori !== "Semua" && item.kategori !== filter.kategori) return false;
      if (filter.q) {
        const q = filter.q.toLowerCase();
        if (!(`${item.deskripsi} ${item.lokasi} ${item.kategori}`.toLowerCase().includes(q))) return false;
      }
      if (filter.dari && item.tanggal < filter.dari) return false;
      if (filter.sampai && item.tanggal > filter.sampai) return false;
      return true;
    });
  }

  const lokasiOptions = Array.from(new Set(["Gudang", "Produksi", "Kantor", "Lapangan", ...laporan.map((x) => x.lokasi)]));
  const kategoriOptions = ["Operasional", "Peralatan", "Lingkungan", "Human Error"];

  const tampil = applyFilter(laporan);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Near-Miss Reporting — Prototipe K3</h1>
          <p className="text-sm text-gray-600">Form sederhana untuk input, melihat, dan mengekspor laporan near-miss. Data disimpan di localStorage.</p>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bg-white p-4 rounded-2xl shadow-sm">
            <h2 className="font-semibold mb-3">Tambah Laporan Near-Miss</h2>
            <form onSubmit={tambahLaporan} className="space-y-3">
              <div>
                <label className="block text-xs font-medium">Tanggal</label>
                <input type="date" name="tanggal" value={form.tanggal} onChange={handleChange} className="mt-1 block w-full rounded-md border px-3 py-2" />
              </div>

              <div>
                <label className="block text-xs font-medium">Lokasi</label>
                <input name="lokasi" value={form.lokasi} onChange={handleChange} placeholder="Masukkan lokasi (mis. Gudang)" className="mt-1 block w-full rounded-md border px-3 py-2" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium">Kategori</label>
                  <select name="kategori" value={form.kategori} onChange={handleChange} className="mt-1 block w-full rounded-md border px-3 py-2">
                    {kategoriOptions.map((k) => (<option key={k} value={k}>{k}</option>))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium">Level Risiko</label>
                  <select name="risiko" value={form.risiko} onChange={handleChange} className="mt-1 block w-full rounded-md border px-3 py-2">
                    <option>Rendah</option>
                    <option>Sedang</option>
                    <option>Tinggi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium">Deskripsi Singkat</label>
                <textarea name="deskripsi" value={form.deskripsi} onChange={handleChange} rows={4} placeholder="Jelaskan apa yang terjadi..." className="mt-1 block w-full rounded-md border px-3 py-2" />
              </div>

              <div>
                <label className="block text-xs font-medium">Foto (opsional)</label>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFotoChange} className="mt-1 block w-full text-sm" />
                {form.fotoBase64 && <img src={form.fotoBase64} alt="preview" className="mt-2 max-h-40 object-contain rounded" />}
              </div>

              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 rounded-full bg-indigo-600 text-white">Simpan</button>
                <button type="button" onClick={() => { setForm({ tanggal: new Date().toISOString().slice(0,10), lokasi: "", kategori: "Operasional", deskripsi: "", risiko: "Rendah", fotoBase64: null }); if (fileInputRef.current) fileInputRef.current.value=null; }} className="px-4 py-2 rounded-full border">Reset Form</button>
              </div>
            </form>

            <div className="mt-4 border-t pt-3">
              <div className="flex items-center gap-2">
                <label className="text-sm">Impor JSON</label>
                <input type="file" accept="application/json" onChange={imporJSON} className="text-sm" />
              </div>
              <div className="mt-2 flex gap-2">
                <button onClick={eksporJSON} className="px-3 py-1 rounded-full border">Ekspor JSON</button>
                <button onClick={resetData} className="px-3 py-1 rounded-full border text-red-600">Reset Semua</button>
              </div>
            </div>
          </section>

          <section className="bg-white p-4 rounded-2xl shadow-sm">
            <h2 className="font-semibold mb-3">Daftar Laporan ({laporan.length})</h2>

            <div className="space-y-2 mb-3">
              <input placeholder="Cari kata kunci..." value={filter.q} onChange={(e)=>setFilter(f=>({...f,q:e.target.value}))} className="block w-full rounded-md border px-3 py-2" />

              <div className="grid grid-cols-2 gap-2">
                <select value={filter.lokasi} onChange={(e)=>setFilter(f=>({...f,lokasi:e.target.value}))} className="rounded-md border px-3 py-2">
                  <option>Semua</option>
                  {lokasiOptions.map((l)=> <option key={l}>{l}</option>)}
                </select>

                <select value={filter.kategori} onChange={(e)=>setFilter(f=>({...f,kategori:e.target.value}))} className="rounded-md border px-3 py-2">
                  <option>Semua</option>
                  {kategoriOptions.map((k)=> <option key={k}>{k}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={filter.dari} onChange={(e)=>setFilter(f=>({...f,dari:e.target.value}))} className="rounded-md border px-3 py-2" />
                <input type="date" value={filter.sampai} onChange={(e)=>setFilter(f=>({...f,sampai:e.target.value}))} className="rounded-md border px-3 py-2" />
              </div>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-auto">
              {tampil.length === 0 && <div className="text-sm text-gray-500">Tidak ada laporan yang cocok.</div>}

              {tampil.map((lap) => (
                <article key={lap.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm text-gray-500">{lap.tanggal} • {lap.lokasi}</div>
                      <h3 className="font-medium">{lap.kategori} — {lap.risiko}</h3>
                      <p className="text-sm mt-1">{lap.deskripsi}</p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="text-xs text-gray-500">{new Date(lap.createdAt).toLocaleString()}</div>
                      <div className="flex gap-2">
                        <button onClick={()=>toggleTindakLanjut(lap.id)} className={`px-2 py-1 rounded text-sm ${lap.tindakLanjut? 'bg-green-100 border':'border'}`}>{lap.tindakLanjut? 'Sudah ditindak' : 'Tindak Lanjut'}</button>
                        <button onClick={()=>hapusLaporan(lap.id)} className="px-2 py-1 rounded text-sm border text-red-600">Hapus</button>
                      </div>
                    </div>
                  </div>

                  {lap.fotoBase64 && <img src={lap.fotoBase64} alt="foto" className="mt-3 max-h-36 object-contain rounded" />}
                </article>
              ))}
            </div>
          </section>
        </main>

        <footer className="mt-6 text-sm text-gray-500 text-center">Prototipe — Simpan data di browser. Untuk produksi, integrasikan backend (API) dan autentikasi.</footer>
      </div>
    </div>
  );
}