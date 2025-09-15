const {
    PrismaClient
} = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        // 1) cria a sequence (schema public)
        await prisma.$executeRawUnsafe(`
      CREATE SEQUENCE IF NOT EXISTS public.order_store_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
    `);

        // 2) sincroniza a sequence com o maior id_order_store existente
        //    Ajuste "public.orders" se sua tabela estiver em outro schema/nome.
        await prisma.$executeRawUnsafe(`
      SELECT setval('public.order_store_seq', COALESCE(
        (SELECT MAX( (regexp_replace(id_order_store, '^[0-9]{4}-', '') )::bigint ) FROM public.orders), 0) + 1, false);
    `);

        // 3) test (mostra um nextval)
        const rows = await prisma.$queryRaw `SELECT nextval('public.order_store_seq') as val`;
        console.log('nextval gerado:', rows?. [0]?.val ?? rows);

        console.log('Sequence public.order_store_seq criada e sincronizada com sucesso.');
    } catch (err) {
        console.error('Erro ao criar/sincronizar order_store_seq:', err);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

main();