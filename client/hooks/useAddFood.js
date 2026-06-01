import { useState } from 'react';
import axios from 'axios';
import { API_URL, STORAGE_KEYS } from '../constants';

export function useAddFood() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function addFood(selected, inventoryDetails) {
    setLoading(true);
    setError(null);
    try {
      const household_id = localStorage.getItem(STORAGE_KEYS.HOUSEHOLD_ID);
      const added_by_member_id = parseInt(localStorage.getItem(STORAGE_KEYS.HOUSEHOLD_MEMBER_ID));

      if (selected._source === 'foodkeeper' || selected._source === 'packaged') {
        const { data } = await axios.post(
          `${API_URL}/foods/add-to-inventory`,
          {
            household_id,
            added_by_member_id,
            source: selected._source === 'foodkeeper' ? 'foodkeeper' : 'packaged',
            source_id: selected.id,
            storage_location: inventoryDetails.storage_location ?? null,
            quantity: inventoryDetails.quantity,
            unit: inventoryDetails.unit ?? 'item',
            expiry_date: inventoryDetails.expiry_date ?? null,
          },
          { headers: { 'content-type': 'application/json' } },
        );
        return data;
      }

      if (selected._source === 'openfoodfacts') {
        const { data: existing } = await axios.get(`${API_URL}/packaged-foods/`);
        const match = existing.find((f) => f.barcode === selected.code);
        let packaged_food_id;

        if (match) {
          packaged_food_id = match.id;
        } else {
          const { data: created } = await axios.post(
            `${API_URL}/packaged-foods/`,
            {
              barcode: selected.code ?? null,
              name: selected.product_name,
              brand: selected.brands ?? null,
              image_url: selected.image_front_url ?? null,
              category: selected.categories ?? null,
              nutrition: selected.nutriments
                ? JSON.stringify(selected.nutriments)
                : null,
            },
            { headers: { 'content-type': 'application/json' } },
          );
          packaged_food_id = created.id;
        }

        const { data } = await axios.post(
          `${API_URL}/foods/add-to-inventory`,
          {
            household_id,
            added_by_member_id,
            source: 'packaged',
            source_id: packaged_food_id,
            storage_location: inventoryDetails.storage_location ?? null,
            quantity: inventoryDetails.quantity,
            unit: inventoryDetails.unit ?? 'item',
            expiry_date: inventoryDetails.expiry_date ?? null,
          },
          { headers: { 'content-type': 'application/json' } },
        );

        return data;
      }

      setError(new Error(`Unknown food source: ${selected._source}`));
      return false;
    } catch (e) {
      setError(e);
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function updateFood(inventoryItem, additionalQuantity, claimOwnership = true) {
    setLoading(true);
    setError(null);
    try {
      const newQuantity =
        parseFloat(inventoryItem.quantity) + parseFloat(additionalQuantity);
      await axios.put(
        `${API_URL}/food-inventory/${inventoryItem.id}`,
        {
          household_id: inventoryItem.household_id,
          added_by_member_id: inventoryItem.added_by_member_id,
          packaged_food_id: inventoryItem.packaged_food_id,
          unpackaged_food_id: inventoryItem.unpackaged_food_id,
          storage_location: inventoryItem.storage_location,
          quantity: newQuantity,
          unit: inventoryItem.unit,
          expiry_date: inventoryItem.expiry_date,
        },
        { headers: { 'content-type': 'application/json' } },
      );

      if (claimOwnership) {
        const memberId = parseInt(localStorage.getItem(STORAGE_KEYS.HOUSEHOLD_MEMBER_ID));
        try {
          await axios.post(`${API_URL}/food-ownerships/`, {
            inventory_item_id: inventoryItem.id,
            member_id: memberId,
          });
        } catch {
          // 400 = already owned, which is fine
        }
      }

      return true;
    } catch (e) {
      setError(e);
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { addFood, updateFood, loading, error };
}
