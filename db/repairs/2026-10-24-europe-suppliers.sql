-- Register four distinct suppliers. Existing profiles and protected evidence stay intact.
INSERT INTO suppliers(slug,name,website) VALUES
 ('epicerie-corner','Epicerie Corner','https://epiceriecorner.co.uk/'),
 ('auguste-noel','Auguste Noel','https://www.augustenoel.co.uk/'),
 ('delicatezza','Delicatezza','https://www.delicatezza.co.uk/'),
 ('catering-mart','The Catering Mart','https://thecateringmart.com/')
ON CONFLICT(slug) DO NOTHING;
