import React, { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  MilkCartonIcon,
  Apple01Icon,
  Calendar03Icon,
  ArrowRight01Icon,
  Tick01Icon,
  Idea01Icon,
} from '@hugeicons/core-free-icons';

const SCAN_TYPES = [
  {
    id: 'packaged',
    icon: MilkCartonIcon,
    label: 'Packaged food',
    description: 'Scan the food packaging to find its details automatically.',
    photo: 'A clear photo of the front of the packaging.',
    tip: 'Make sure the entire item is in the frame.',
    imageSrc: "https://i.postimg.cc/BbDXTqYv/packaged.jpg",
    imageAlt: 'Packaged food example photo',
  },
  {
    id: 'unpackaged',
    icon: Apple01Icon,
    label: 'Unpackaged food',
    description: 'Photograph fresh produce, meat, or anything without an expiry date and we\'ll identify it for you.',
    photo: 'A clear photo of the entire food item.',
    tip: 'Make sure the entire item is in the frame.',
    imageSrc: "https://i.postimg.cc/ryt0XJVW/unpackaged.jpg",
    imageAlt: 'Unpackaged food example photo',
  },
  {
    id: 'expiry',
    icon: Calendar03Icon,
    label: 'Expiry date',
    description: 'Photograph the use-by or best-before label to log the date automatically.',
    photo: 'A clear photo of the expiry date label.',
    tip: 'Ensure the date is in focus and fully visible.',
    imageSrc: "https://i.postimg.cc/BQ98qKbD/expiry.jpg",
    imageAlt: 'Food expiry date label example photo',
  },
];

const ScanGuide = () => {
  const [selected, setSelected] = useState(null);

  const selectedType = SCAN_TYPES.find((t) => t.id === selected);

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div>
        <h2 className="font-sansation text-water-800 text-3xl font-bold mb-1">
          AI Scan Guide
        </h2>
        <p className="text-water-600 text-sm">
          Take a photo to add food to your fridge. No typing needed.
        </p>
      </div>

      {/* Step 1: Choose scan type */}
      <div>
        <p className="text-water-700 text-xs font-semibold uppercase tracking-widest mb-3">
          Step 1: Choose scan type
        </p>
        <div className="flex flex-col gap-2">
          {SCAN_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelected(type.id)}
              className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-150 hover:cursor-pointer
                ${selected === type.id
                  ? 'border-water-500 bg-water-50 shadow-sm'
                  : 'border-water-200 bg-white hover:border-water-300 hover:bg-water-50'
                }`}
            >
              <div className={`rounded-xl p-2 ${selected === type.id ? 'bg-water-100' : 'bg-water-50'}`}>
                <HugeiconsIcon
                  icon={type.icon}
                  size={22}
                  className={selected === type.id ? 'text-water-700' : 'text-water-400'}
                />
              </div>
              <div className="flex-1">
                <p className={`text-sm font-semibold ${selected === type.id ? 'text-water-800' : 'text-water-700'}`}>
                  {type.label}
                </p>
                <p className="text-water-500 text-xs">{type.description}</p>
              </div>
              {selected === type.id && (
                <HugeiconsIcon icon={Tick01Icon} size={18} className="text-water-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Photo instructions, shown after selection */}
      {selectedType && (
        <div className="flex flex-col gap-3">
          <p className="text-water-700 text-xs font-semibold uppercase tracking-widest">
            Step 2: Take your photo
          </p>

          {/* Example image */}
          <div className="overflow-hidden rounded-2xl border border-water-200">
            <img
              src={selectedType.imageSrc}
              alt={selectedType.imageAlt}
              className="h-100 w-full object-cover"
            />
          </div>

          {/* What to photograph */}
          <div className="bg-water-50 border border-water-200 rounded-2xl p-4 flex flex-col gap-1">
            <p className="text-water-800 text-sm font-semibold">What to photograph</p>
            <p className="text-water-600 text-sm">{selectedType.photo}</p>
          </div>

          {/* Tip */}
          <div className="bg-water-50 border border-water-200 rounded-2xl p-4 flex items-start gap-2">
            <HugeiconsIcon icon={Idea01Icon} size={16} className="text-water-400 shrink-0 mt-0.5" />
            <p className="text-water-600 text-sm">{selectedType.tip}</p>
          </div>

          {/* What happens next */}
          <div className="flex items-center gap-2 px-1">
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} className="text-water-400 shrink-0" />
            <p className="text-water-500 text-xs">
              {selected === 'unpackaged'
                ? 'We\'ll identify the food and pre-fill its details for you to confirm.'
                : selected === 'expiry'
                ? 'We\'ll read the date and attach it to your item automatically.'
                : 'We\'ll look up the product and pre-fill its name, category, and shelf life.'}
            </p>
          </div>
        </div>
      )}

    </div>
  );
};

export default ScanGuide;