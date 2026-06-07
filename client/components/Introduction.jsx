import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { VegetarianFoodIcon, DollarCircleIcon, EarthIcon } from '@hugeicons/core-free-icons';

const Introduction = () => {
  return (
    <div className="flex flex-col gap-6">

      <div>
        <h2 className="font-sansation text-water-800 text-4xl font-bold mb-1">
          About FridgePeace
        </h2>
        <p className="text-water-600 text-base">
          Fridge and pantry management for share houses.
        </p>
      </div>

      <p className="text-water-700 text-sm leading-relaxed">
        FridgePeace helps university students living in shared housing take
        control of their food. Know what's in the fridge, reduce waste, and
        keep things fair between housemates, without the awkward conversations.
      </p>

      <div className="flex flex-col gap-3">
        <div className="bg-water-50 border border-water-200 rounded-2xl p-4">
          <h3 className="text-water-800 font-semibold mb-1 flex items-center gap-2">
            <HugeiconsIcon icon={VegetarianFoodIcon} size={20} color="currentColor" />
            Track your food
          </h3>
          <p className="text-water-700 text-sm">
            Tag items as personal or shared, and always know what's yours.
          </p>
        </div>
        <div className="bg-water-50 border border-water-200 rounded-2xl p-4">
          <h3 className="text-water-800 font-semibold mb-1 flex items-center gap-2">
            <HugeiconsIcon icon={DollarCircleIcon} size={20} color="currentColor" />
            Cut food waste costs
          </h3>
          <p className="text-water-700 text-sm">
            Receive notifications when your food is close to expiry.
          </p>
        </div>
        <div className="bg-water-50 border border-water-200 rounded-2xl p-4">
          <h3 className="text-water-800 font-semibold mb-1 flex items-center gap-2">
            <HugeiconsIcon icon={EarthIcon} size={20} color="currentColor" />
            Good for the planet
          </h3>
          <p className="text-water-700 text-sm">
            FridgePeace was developed with the UN goal for responsible consumption and production in mind.
          </p>
        </div>
      </div>

    </div>
  );
};

export default Introduction;