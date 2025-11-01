import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
// Fix: Use scoped firebase package to resolve module export errors.
import { collection, getDocs } from '@firebase/firestore';
import type { Department } from '../types';

export default function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const departmentsCollection = collection(db, 'departments');
        const querySnapshot = await getDocs(departmentsCollection);
        const depsArray: Department[] = [];
        querySnapshot.forEach(doc => {
          depsArray.push({ id: doc.id, ...doc.data() } as Department);
        });
        setDepartments(depsArray);
      } catch (error) {
        console.error("Error fetching departments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  return { departments, loading };
}