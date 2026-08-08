import ImagesClient from "./ImagesClient";

export default function ImagesPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">Generátor obrázků</h1>
        <p className="text-zinc-500 text-sm mt-1">AI obrázky přes Flux Schnell — samostatná knihovna</p>
      </div>
      <ImagesClient />
    </div>
  );
}
