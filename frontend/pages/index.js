import { useState, useEffect } from 'react';

export default function Home() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: '', value: '' });

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const fetchItems = async () => {
    const res = await fetch(`${API_URL}/api/items`);
    const data = await res.json();
    setItems(data);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    await fetch(`${API_URL}/api/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ name: '', value: '' });
    setTimeout(fetchItems, 2000); // Wait for worker, then refresh
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name" />
        <input value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder="Value" />
        <button type="submit">Add Item</button>
      </form>
      <ul>
        {items.map(item => <li key={item._id}>{item.name}: {item.value}</li>)}
      </ul>
    </div>
  );
}
