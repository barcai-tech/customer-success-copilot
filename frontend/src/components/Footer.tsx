export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="py-8 border-t border-slate-200/60 dark:border-slate-800/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-sm text-slate-600 dark:text-slate-400 text-center">
        <p>
          © {year} Customer Success Copilot by Barcai Technology. All rights
          reserved.
        </p>
      </div>
    </footer>
  );
}
