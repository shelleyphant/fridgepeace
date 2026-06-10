import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCards } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-cards';
import FoodCard from './FoodCard';

const FoodCardStack = ({ items, className }) => {
  return (
    <Swiper
      effect="cards"
      modules={[EffectCards]}
      grabCursor
      rewind={true}
      className={`${className} w-full`}
    >
      {items.map((item) => (
        <SwiperSlide key={item.id}>
          <FoodCard item={item} />
        </SwiperSlide>
      ))}
    </Swiper>
  );
};

export default FoodCardStack;
