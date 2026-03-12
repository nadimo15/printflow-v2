import prisma from './src/prisma/client';

async function main() {
    const products = await prisma.product.findMany();
    console.log("ALL PRODUCTS:", JSON.stringify(products, null, 2));

    // Let's publish all of them so the storefront can see them!
    if (products.length > 0) {
        await prisma.product.updateMany({
            data: { isPublished: true, isActive: true }
        });
        console.log("✅ Updated all products to be published and active.");
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
