export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="app-footer">
      <p>© {year} Jinseung Yu. Tabula Rasa College</p>
    </footer>
  );
}
