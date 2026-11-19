'use client';

import { useState } from 'react';
import CategoryIcon from './category-icon';

const departments = [
  ['Grocery & Kitchen', ['Produce', 'Dairy', 'Pantry', 'Rice & Grains', 'Cooking Essentials', 'Dairy & Bread', 'Biscuits & Bakery']],
  ['Snacks & Drinks', ['Chips & Snacks', 'Drinks & Juices', 'Tea & Coffee', 'Instant Foods']],
  ['Beauty & Personal Care', ['Personal Care']],
];

function CategoryTile({ name, photo, onSelect }) {
  const [failedPhoto, setFailedPhoto] = useState(null);
  return <button type="button" onClick={() => onSelect(name)}>
    <span className="directory-photo">
      {photo && photo !== failedPhoto ? <img src={photo} alt="" loading="lazy" decoding="async"
        referrerPolicy="no-referrer" onError={() => setFailedPhoto(photo)} /> : <CategoryIcon name={name} />}
    </span>
    <span className="directory-label">{name}</span>
  </button>;
}

export default function CategoryDirectory({ categories, products, onSelect }) {
  const assigned = new Set(departments.flatMap(([, names]) => names));
  const groups = [...departments, ['More categories', categories.filter(name => !assigned.has(name))]];

  return <div className="category-directory">
    {groups.map(([title, names]) => {
      const available = names.filter(name => categories.includes(name));
      return available.length > 0 && <section key={title} aria-label={title}>
        <h2>{title}</h2>
        <div className="directory-grid">
          {available.map(name => <CategoryTile key={name} name={name}
            photo={products.find(product => product.category === name && product.imageUrl)?.imageUrl}
            onSelect={onSelect} />)}
        </div>
      </section>;
    })}
  </div>;
}
