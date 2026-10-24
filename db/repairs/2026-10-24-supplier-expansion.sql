-- Add discovery suppliers without changing existing supplier rows or identity evidence.
INSERT INTO suppliers(slug,name,website) VALUES
 ('appleton-sweets','Appleton Sweets','https://www.appletonsweets.co.uk/'),
 ('kandy-king','The Kandy King','https://www.thekandyking.co.uk/'),
 ('hollywood-candy','Hollywood Candy Wholesale','https://www.hollywoodcandywholesale.co.uk/'),
 ('candy-theatre','Candy Theatre','https://www.candytheatre.com/'),
 ('sweets-treats','Sweets & Treats Wholesale','https://www.sweetsandtreatswholesale.co.uk/'),
 ('bon-bons','Bon Bon’s Wholesale','https://bonbons.co.uk/')
ON CONFLICT(slug) DO NOTHING;
