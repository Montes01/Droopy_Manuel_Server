import { Router } from 'express';
import dogsAdminRouter from './dogs.js';
import projectAdminRouter from './project.js';
import shopAdminRouter from './shop.js';
import newsAdminRouter from './news.js';
import siteAdminRouter from './site.js';
import ordersAdminRouter from './orders.js';

/**
 * Rutas del panel de administración.
 *
 * Cada recurso vive en su propio archivo y aplica `requireAdmin` por dentro,
 * así que es imposible añadir un endpoint de escritura sin proteger: si falta
 * el middleware, no hay forma de pasar la autenticación.
 *
 * El prefijo es `/api/admin`.
 */
const router = Router();

router.use('/dogs', dogsAdminRouter);
router.use('/project', projectAdminRouter);
router.use('/shop', shopAdminRouter);
router.use('/news', newsAdminRouter);
router.use('/site', siteAdminRouter);
router.use('/orders', ordersAdminRouter);

export default router;
