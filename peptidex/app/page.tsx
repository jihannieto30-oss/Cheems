'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Preloader from '@/components/Preloader';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Categories from '@/components/Categories';
import Science from '@/components/Science';
import ProductShowcase from '@/components/ProductShowcase';
import Manifesto from '@/components/Manifesto';
import Footer from '@/components/Footer';

export default function Home() {
  const [ready, setReady] = useState(false);

  return (
    <>
      <Preloader onComplete={() => setReady(true)} />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: ready ? 1 : 0 }}
        transition={{ duration: 0.8 }}
      >
        <Navbar />
        <Hero />
        <Categories />
        <Science />
        <ProductShowcase />
        <Manifesto />
        <Footer />
      </motion.main>
    </>
  );
}
