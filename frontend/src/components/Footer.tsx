export default function Footer() {
  return (
    <footer className="w-full border-t mt-10">
      <div className="max-w-5xl mx-auto px-4 py-6 text-xs text-muted-foreground flex items-center justify-between">
        <p>© {new Date().getFullYear()} Barcai Technology</p>
        <p className="opacity-80">Demo • Customer Success Copilot</p>
      </div>
    </footer>
  );
}

